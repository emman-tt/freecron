import {
  type createJobDTO,
  type JobFilters,
  type updateJobDTO,
  type jobResponseDTO,
} from "./job.types.js";
import type { JobRespository } from "./job.repository.js";
import type { CronService } from "../../shared/lib/cron.service.js";
import type { Job } from "../../shared/types/entities.js";
import type { SharedCacheRepository } from "../../shared/repositories/cache.repository.js";
import {
  NotFoundError,
  PermissionError,
} from "../../shared/errors/business.errors.js";
import type { SchedularService } from "../Scheduler/schedular.service.js";
import {
  DEFAULT_LIMIT,
  resolvePagination,
  toPaginated,
  FIRST_PAGE_CACHE_LIMIT,
  FIRST_PAGE_CACHE_TTL,
  type PaginatedResponse,
  type PaginationParams,
} from "../../shared/types/pagination.js";
import type { Logger } from "pino";
import { UnrecoverableError } from "bullmq";

export class JobService {
  private jobRepo: JobRespository;
  private cronManger: CronService;
  private cacheRepo: SharedCacheRepository;
  private schedular: SchedularService;

  constructor(
    jobRepo: JobRespository,
    cronManger: CronService,
    cacheRepo: SharedCacheRepository,
    schedular: SchedularService,
  ) {
    this.jobRepo = jobRepo;
    this.cronManger = cronManger;
    this.cacheRepo = cacheRepo;
    this.schedular = schedular;
  }

  async createJob(
    data: createJobDTO,
    userId: string,
    log: Logger,
  ): Promise<jobResponseDTO> {
    //Validate the cron expression
    const isValidCron = this.cronManger.validateCron(data.cronExpression);

    if (!isValidCron) {
      console.log("invalid cron, return unsatisfied");
      throw new Error("INVALID CRON");
    }

    //Calculate system logic and defaults (next and last runs)
    const nextRunAt = this.cronManger.findNextRun(data.cronExpression);
    const lastRunAt = null;

    //Call database repo to save new job
    const createdJob = (await this.jobRepo.create(
      data,
      userId,
      nextRunAt,
      lastRunAt,
    )) as Job;

    //Log job created
    log.info(
      {
        jobId: createdJob.id,
        userId: userId,
        isActive: createdJob.isActive,
        maxRetries: createdJob.maxRetries,
        httpCommand: createdJob.httpCommand,
      },
      "job created",
    );

    const delayMs = this.cronManger.findDelayMs(data.cronExpression);

    //Call Schedular service to schedule this new job
    this.schedular.scheduleJob(createdJob?.id as number, userId, delayMs, log);

    //Invalidate and clear  cache (single + first-page list)
    this.invalidateCache(createdJob?.id as number, userId);

    //Return appropraite response object
    return this.toResponseDTO(createdJob);
  }

  async findJobUser(
    jobId: number,
    userId: string,
    log: Logger,
  ): Promise<jobResponseDTO> {
    // Check cache exists else fetch from db
    const cacheKey = `job:${jobId}`;
    const cacheData = await this.cacheRepo.get<Job>(cacheKey);

    if (cacheData) {
      return this.toResponseDTO(cacheData);
    }

    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found for user",
      );
      throw new NotFoundError();
    }

    // Check ownership  and store in cache
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesnt belong to user",
      );
      throw new PermissionError();
    }

    await this.cacheRepo.set(`job:${fetchedJob?.id}`, fetchedJob);

    // Return to user
    return this.toResponseDTO(fetchedJob);
  }

  async findJobSystem(jobId: number, log: Logger): Promise<Job> {
    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.error(
        {
          jobId: jobId,
        },
        "job not found for system",
      );
      throw new UnrecoverableError("job not found");
    }

    // Return to system
    return fetchedJob;
  }
  async findJobAndUser(jobId: number, log: Logger) {
    const fetched = await this.jobRepo.findOneAndJoinUser(jobId);

    if (!fetched) {
      log.error(
        {
          jobId: jobId,
        },
        "job not found for system",
      );
      throw new UnrecoverableError("job not found");
    }

    // Drizzle keys the join by DB table name ({ job, users }) — returned
    // as-is for the notification worker
    return fetched;
  }

  async findAllJobsUser(
    userId: string,
    { page, limit }: PaginationParams,
    filters: JobFilters = {},
    log: Logger,
  ): Promise<PaginatedResponse<jobResponseDTO>> {
    // Only cache first page with fixed default limit and no filters.
    // Everything else bypasses cache straight to DB.
    const isCacheable =
      page === 1 &&
      limit === FIRST_PAGE_CACHE_LIMIT &&
      Object.keys(filters).length === 0;

    const cacheKey = `jobs:user:${userId}:p1:l${FIRST_PAGE_CACHE_LIMIT}`;

    if (isCacheable) {
      const cached =
        await this.cacheRepo.get<PaginatedResponse<jobResponseDTO>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { offset } = resolvePagination({ page, limit });

    const [fetchedJobs, total] = await Promise.all([
      this.jobRepo.findAllByUser(userId, limit, offset, filters),
      this.jobRepo.countByUser(userId, filters),
    ]);

    const data = fetchedJobs.map((job) => this.toResponseDTO(job));

    // Return to user
    const paginated = toPaginated(data, total, { page, limit });

    if (isCacheable) {
      await this.cacheRepo.set(cacheKey, paginated, FIRST_PAGE_CACHE_TTL);
    }

    return paginated;
  }

  async toggleActive(
    jobId: number,
    userId: string,
    log: Logger,
  ): Promise<jobResponseDTO> {
    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }

    // Check ownership
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesn't belong to user",
      );
      throw new PermissionError();
    }

    // Toggle isActive in database
    const updatedJob = await this.jobRepo.toggleActive(jobId);

    if (!updatedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }

    if (!updatedJob.isActive) {
      // If paused → Unschedule or remove from queue
      this.schedular.unscheduleJob(updatedJob.id, log);
    } else {
      // const nextRunAt = this.cronManger.findNextRun(updatedJob.cronExpression);
      const delayMs = this.cronManger.findDelayMs(updatedJob.cronExpression);

      // If resumed → Recalculate delay  + Schedule && add it to queue
      this.schedular.scheduleJob(jobId, userId, delayMs, log);
    }

    this.invalidateCache(jobId, userId);

    return this.toResponseDTO(updatedJob);
  }

  async deleteJob(jobId: number, userId: string, log: Logger) {
    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }
    // Check ownership  and store in cache
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesnt belong to user",
      );
      throw new PermissionError();
    }

    //invalidate every cache both for one job and all jobs
    this.invalidateCache(jobId, userId);
    await this.jobRepo.delete(jobId);
  }

  async updateJob(
    jobId: number,
    updateDTO: updateJobDTO,
    userId: string,
    log: Logger,
  ): Promise<jobResponseDTO> {
    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }
    // Check ownership  and store in cache
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesnt belong to user",
      );
      throw new PermissionError();
    }

    // If cron changed → Validate + Recalculate nextRunAt
    const jobEntity = fetchedJob;
    if (
      updateDTO.cronExpression !== undefined &&
      fetchedJob.cronExpression !== updateDTO.cronExpression
    ) {
      this.cronManger.validateCron(updateDTO.cronExpression);
      const nextRunAt = this.cronManger.findNextRun(updateDTO.cronExpression);
      jobEntity.nextRunAt = nextRunAt;
    }

    // Update database with the upcoming user DTO and system calculates
    await this.jobRepo.update(jobId, updateDTO);

    //invalidate every cache both for one job and all jobs
    this.invalidateCache(jobId, userId);

    return this.toResponseDTO(jobEntity);
  }
  async updateRunTimes(
    jobId: number,
    nextRunAt: Date,
    lastRunAt: Date = new Date(),
    userId: string,
    log: Logger,
  ): Promise<jobResponseDTO> {
    const fetchedJob = (await this.jobRepo.findById(jobId)) as Job;

    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }
    // Check ownership  and store in cache
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesnt belong to user",
      );
      throw new PermissionError();
    }

    // Update database with the run times
    await this.jobRepo.updateRunTimes(fetchedJob.id!, lastRunAt, nextRunAt);

    this.invalidateCache(jobId);
    return this.toResponseDTO(fetchedJob);
  }

  async runJobNow(jobId: number, userId: string, log: Logger): Promise<void> {
    const fetchedJob = await this.jobRepo.findById(jobId);
    if (!fetchedJob) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job not found",
      );
      throw new NotFoundError();
    }

    // Check ownership  and store in cache
    if (fetchedJob.userId !== userId) {
      log.warn(
        {
          jobId: jobId,
          userId: userId,
        },
        "job doesnt belong to user",
      );
      throw new PermissionError();
    }

    //Call schedular service to run this job immediately
    await this.schedular.runJobNow(jobId, userId, log);
  }

  private invalidateCache(jobId: number, userId?: string) {
    void this.cacheRepo.delete(`job:${jobId}`);
    if (userId) {
      void this.cacheRepo.delete(
        `jobs:user:${userId}:p1:l${FIRST_PAGE_CACHE_LIMIT}`,
      );
    }
  }

  private toResponseDTO(entity: Job): jobResponseDTO {
    const jobId = entity.id;

    if (jobId === undefined) {
      throw new Error("Job id is required for response DTO");
    }

    return {
      id: jobId,
      name: entity.name,
      description: entity.description,
      cronExpression: entity.cronExpression,
      httpCommand: entity.httpCommand,
      httpMethod: entity.httpMethod,
      isActive: entity.isActive,
      lastRunAt: entity.lastRunAt,
      nextRunAt: entity.nextRunAt,
    };
  }
}

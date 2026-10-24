import {
  beforeAll,
  describe,
  expect,
  it,
  jest,
  beforeEach,
} from "@jest/globals";
import type { Job, User } from "../../../shared/types/entities.js";
import { UnrecoverableError } from "bullmq";
import type {
  createJobDTO,
  updateJobDTO,
  jobResponseDTO,
} from "../job.types.js";
import { JobService } from "../job.service.js";
import type { JobRespository } from "../job.repository.js";
import type { CronService } from "../../../shared/lib/cron.service.js";
import type { SharedCacheRepository } from "../../../shared/repositories/cache.repository.js";
import type { SchedularService } from "../../Scheduler/schedular.service.js";
import {
  NotFoundError,
  PermissionError,
} from "../../../shared/errors/business.errors.js";
import { JOB_DEFUALTS } from "../job.defaults.js";
import type { Logger } from "pino";

describe("Job Service", () => {
  //Sample data
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userDTO = {
    jobId: 5,
    userId: "sdjdn32e233",
    cacheKey: `job:${5}`,
  };

  const timeDTO = {
    lastRunAt: new Date(),
    nextRunAt: new Date("2026-09-14T06:30:00.000Z"),
  };

  const returnedJobFromDb: Job = {
    id: 5,
    name: "astroverse",
    cronExpression: "*/5 * * * *",
    httpBody: {},
    httpCommand: "https://google.com",
    httpHeader: {},
    httpMethod: "GET",
    timeout: 30000,
    userId: "sdjdn32e233",
    isActive: true,
    description: null,
    maxRetries: 3,
    retryDelay: 60,
    lastRunAt: timeDTO.lastRunAt,
    nextRunAt: timeDTO.nextRunAt,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const dueJobs = [returnedJobFromDb, returnedJobFromDb, returnedJobFromDb];
  const userJobs = [returnedJobFromDb, returnedJobFromDb, returnedJobFromDb];

  const returnedJobFromCache = {
    id: 5,
    name: "astroverse",
    cronExpression: "*/5 * * * *",
    httpBody: {},
    httpCommand: "https://google.com",
    httpHeader: {},
    httpMethod: "GET",
    timeout: 30000,
    userId: "sdjdn32e233",
    isActive: true,
    description: null,
    maxRetries: 3,
    retryDelay: 60,
    lastRunAt: timeDTO.lastRunAt,
    nextRunAt: timeDTO.nextRunAt,
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  const jobResponseForUser: jobResponseDTO = {
    id: returnedJobFromDb.id as number,
    name: returnedJobFromDb.name,
    description: returnedJobFromDb.description,
    cronExpression: returnedJobFromDb.cronExpression,
    httpCommand: returnedJobFromDb.httpCommand,
    httpMethod: returnedJobFromDb.httpMethod,
    isActive: returnedJobFromDb.isActive,
    lastRunAt: returnedJobFromDb.lastRunAt,
    nextRunAt: returnedJobFromDb.nextRunAt,
  };

  const createJobEntity: createJobDTO = {
    name: "astroverse",
    cronExpression: "*/5 * * * *",
    httpCommand: "https://google.com",
    httpMethod: "DELETE",
    description: JOB_DEFUALTS.description,
    httpBody: JOB_DEFUALTS.httpBody,
    httpHeader: JOB_DEFUALTS.httpHeader,
  };

  //Setups ,service and object mocks
  const jobRepo = {
    create:
      jest.fn<
        (
          data: createJobDTO,
          userId: string,
          nextRunAt: Date,
          lastRunAt: Date | null,
        ) => Promise<Job>
      >(),
    findById: jest.fn<(id: number) => Promise<Job | undefined | null>>(),
    findOneAndJoinUser: jest.fn<
      (id: number) => Promise<{ job: Job; users: User } | undefined>
    >(),
    findAllByUser: jest.fn<
      (
        userId: string,
        limit: number,
        offset: number,
        filters?: unknown,
      ) => Promise<Job[]>
    >(),
    countByUser: jest.fn<(userId: string, filters?: unknown) => Promise<number>>(),
    findDueJobs: jest.fn<(nowDate: Date) => Promise<Job[]>>(),
    toggleActive: jest.fn<(id: number) => Promise<Job>>(),
    delete: jest.fn<(id: number) => Promise<Job>>(),
    updateRunTimes:
      jest.fn<(id: number, lastRunAt: Date, nextRunAt: Date) => Promise<Job>>(),
    update: jest.fn<(id: number, updateDTO: updateJobDTO) => Promise<Job>>(),
  };

  const cronManager = {
    validateCron: jest.fn<(cron: string) => boolean>(),
    findNextRun: jest.fn<(cron: string) => Date>(),
    findDelayMs: jest.fn<(cron: string) => number>(),
  };

  const cacheRepo = {
    delete: jest.fn<(key: string) => Promise<void>>(),
    get: jest.fn<(key: string) => Promise<unknown>>(),
    set: jest.fn<
      (key: string, value: unknown, ttl?: number) => Promise<void>
    >(),
  };

  const scheduler = {
    scheduleJob:
      jest.fn<
        (jobId: number, userId: string, delay: number, log: Logger) => void
      >(),
    unscheduleJob: jest.fn<(jobId: number, log: Logger) => void>(),
    unJobNow: jest.fn<(jobId: number, userId: string) => void>(),
    runJobNow:
      jest.fn<(jobId: number, userId: string, log: Logger) => void>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const jobService = new JobService(
    jobRepo as unknown as JobRespository,
    cronManager as unknown as CronService,
    cacheRepo as unknown as SharedCacheRepository,
    scheduler as unknown as SchedularService,
  );

  //TESTS

  //UPDATE JOB WITH FILTERS

  it("should run a job now ", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue(returnedJobFromDb);

    await jobService.runJobNow(userDTO.jobId, userDTO.userId, mockLog);
    //Assert

    expect(scheduler.runJobNow).toHaveBeenCalledWith(
      userDTO.jobId,
      userDTO.userId,
      mockLog,
    );
  });

  it("should check ownership as wrong and throw error when updating", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue({
      ...returnedJobFromDb,
      userId: "d3233",
    });

    //Assert

    await expect(
      jobService.update(userDTO.jobId, {}, userDTO.userId, mockLog),
    ).rejects.toThrow(PermissionError);
    expect(jobRepo.update).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: userDTO.jobId }),
      expect.any(String),
    );
  });

  it("should update run times of a job", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue(returnedJobFromDb);

    //Act
    const result = await jobService.updateRunTimes(
      userDTO.jobId,
      timeDTO.nextRunAt,
      timeDTO.lastRunAt,
      userDTO.userId,
      mockLog,
    );

    //Assert
    expect(jobRepo.updateRunTimes).toHaveBeenCalledWith(
      userDTO.jobId,
      timeDTO.lastRunAt,
      timeDTO.nextRunAt,
    );
    expect(result).toMatchObject(jobResponseForUser);
    expect(cacheRepo.delete).toHaveBeenCalledTimes(1);
  });

  it("should delete a job", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue(returnedJobFromDb);
    jobRepo.delete.mockResolvedValue(returnedJobFromDb);

    //Act
    await jobService.delete(userDTO.jobId, userDTO.userId, mockLog);

    //Assert
    expect(cacheRepo.delete).toHaveBeenCalledTimes(2);
    expect(cacheRepo.delete).toHaveBeenCalledWith(`job:${userDTO.jobId}`);
    expect(cacheRepo.delete).toHaveBeenCalledWith(
      `jobs:user:${userDTO.userId}:p1:l20`,
    );
    expect(jobRepo.delete).toHaveBeenCalledWith(userDTO.jobId);
  });

  it("should pause a job by toggling to isActive to false ", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue({
      ...returnedJobFromDb,
      isActive: true,
    });
    jobRepo.toggleActive.mockResolvedValue({
      ...returnedJobFromDb,
      isActive: false,
    });
    cronManager.findDelayMs.mockReturnValue(400);

    //Act
    const updatedResult = await jobService.toggleActive(
      userDTO.jobId,
      userDTO.userId,
      mockLog,
    );

    //Assert
    expect(cacheRepo.delete).toHaveBeenCalledTimes(2);
    expect(jobRepo.findById).toHaveBeenCalled();
    expect(scheduler.scheduleJob).toHaveBeenCalledTimes(0);
    expect(jobRepo.toggleActive).toHaveBeenCalledWith(userDTO.jobId);
    expect(updatedResult).toHaveProperty("isActive", false);
    expect(scheduler.unscheduleJob).toHaveBeenCalledWith(
      userDTO.jobId,
      mockLog,
    );
  });

  it("should resume a job by toggling to isActive to true ", async () => {
    //Arrange
    jobRepo.findById.mockResolvedValue({
      ...returnedJobFromDb,
      isActive: false,
    });
    jobRepo.toggleActive.mockResolvedValue({
      ...returnedJobFromDb,
      isActive: true,
    });
    cronManager.findDelayMs.mockReturnValue(400);

    //Act
    const updatedResult = await jobService.toggleActive(
      userDTO.jobId,
      userDTO.userId,
      mockLog,
    );

    //Assert
    expect(cacheRepo.delete).toHaveBeenCalledTimes(2);
    expect(jobRepo.findById).toHaveBeenCalled();
    expect(scheduler.unscheduleJob).toHaveBeenCalledTimes(0);
    expect(jobRepo.toggleActive).toHaveBeenCalledWith(userDTO.jobId);
    expect(updatedResult).toHaveProperty("isActive", true);
    expect(scheduler.scheduleJob).toHaveBeenCalledWith(
      userDTO.jobId,
      userDTO.userId,
      400,
      mockLog,
    );
  });

  it("should find all jobs for a user straight from the database", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    jobRepo.findAllByUser.mockResolvedValue(userJobs);
    jobRepo.countByUser.mockResolvedValue(userJobs.length);

    //Act
    const result = await jobService.findAllJobsUser(
      userDTO.userId,
      {
        page: 1,
        limit: 20,
      },
      {},
      mockLog,
    );

    //Assert
    expect(jobRepo.findAllByUser).toHaveBeenCalledWith(
      userDTO.userId,
      20,
      0,
      {},
    );
    expect(jobRepo.countByUser).toHaveBeenCalledWith(userDTO.userId, {});
    expect(cacheRepo.get).toHaveBeenCalledWith(
      `jobs:user:${userDTO.userId}:p1:l20`,
    );
    expect(cacheRepo.set).toHaveBeenCalledWith(
      `jobs:user:${userDTO.userId}:p1:l20`,
      expect.objectContaining({ meta: expect.objectContaining({ page: 1 }) }),
      60,
    );

    expect(result.data).toEqual([
      jobResponseForUser,
      jobResponseForUser,
      jobResponseForUser,
    ]);
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it("should return first page from cache without hitting db", async () => {
    //Arrange
    const cachedResponse = {
      data: [jobResponseForUser],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
    cacheRepo.get.mockResolvedValue(cachedResponse);

    //Act
    const result = await jobService.findAllJobsUser(
      userDTO.userId,
      {
        page: 1,
        limit: 20,
      },
      {},
      mockLog,
    );

    //Assert
    expect(cacheRepo.get).toHaveBeenCalledWith(
      `jobs:user:${userDTO.userId}:p1:l20`,
    );
    expect(jobRepo.findAllByUser).not.toHaveBeenCalled();
    expect(jobRepo.countByUser).not.toHaveBeenCalled();
    expect(cacheRepo.set).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResponse);
  });

  it("should bypass cache for page 2 and non-default limit", async () => {
    //Arrange
    jobRepo.findAllByUser.mockResolvedValue(userJobs);
    jobRepo.countByUser.mockResolvedValue(userJobs.length);

    //Act page 2
    await jobService.findAllJobsUser(
      userDTO.userId,
      { page: 2, limit: 20 },
      {},
      mockLog,
    );
    //Act non-default limit
    await jobService.findAllJobsUser(
      userDTO.userId,
      { page: 1, limit: 50 },
      {},
      mockLog,
    );

    //Assert
    expect(cacheRepo.get).not.toHaveBeenCalled();
    expect(cacheRepo.set).not.toHaveBeenCalled();
    expect(jobRepo.findAllByUser).toHaveBeenCalledTimes(2);
  });

  it("should pass filters to db and bypass cache", async () => {
    //Arrange
    jobRepo.findAllByUser.mockResolvedValue(userJobs);
    jobRepo.countByUser.mockResolvedValue(userJobs.length);
    const filters = { isActive: false, httpMethod: "POST", name: "back" } as const;

    //Act
    const result = await jobService.findAllJobsUser(
      userDTO.userId,
      { page: 1, limit: 20 },
      { ...filters },
      mockLog,
    );

    //Assert
    expect(cacheRepo.get).not.toHaveBeenCalled();
    expect(cacheRepo.set).not.toHaveBeenCalled();
    expect(jobRepo.findAllByUser).toHaveBeenCalledWith(
      userDTO.userId,
      20,
      0,
      filters,
    );
    expect(jobRepo.countByUser).toHaveBeenCalledWith(userDTO.userId, filters);
    expect(result.data).toHaveLength(3);
  });

  it("should throw error if no job for user", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    jobRepo.findById.mockResolvedValue(null);

    //Act + Assert
    await expect(
      jobService.findJobUser(userDTO.jobId, userDTO.userId, mockLog),
    ).rejects.toThrow(NotFoundError);
  });

  it("should find a job for a user from database no cache", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    jobRepo.findById.mockResolvedValue(returnedJobFromDb);

    //Act
    const result = await jobService.findJobUser(
      userDTO.jobId,
      userDTO.userId,
      mockLog,
    );

    //Assert
    expect(jobRepo.findById).toHaveBeenCalledWith(userDTO.jobId);
    expect(cacheRepo.get).toHaveBeenCalledWith(userDTO.cacheKey);
    expect(cacheRepo.set).toHaveBeenCalledTimes(1);
    expect(cacheRepo.set).toHaveBeenCalledWith(
      `job:${userDTO.jobId}`,
      returnedJobFromDb,
    );

    expect(result).toMatchObject(jobResponseForUser);
  });

  it("should create a job", async () => {
    const cronExpression = "30 6 * * *";

    // Arrange
    cronManager.validateCron.mockReturnValue(true);
    cronManager.findDelayMs.mockReturnValue(50000);
    cronManager.findNextRun.mockReturnValue(new Date(Date.now() + 20000));
    jobRepo.create.mockResolvedValue(returnedJobFromDb);

    // Act
    const result = await jobService.create(
      createJobEntity,
      "sdjdn32e233",
      mockLog,
    );
    const isValidCron = cronManager.validateCron(cronExpression);
    const nextRunAt = cronManager.findNextRun(cronExpression);
    const lastRunAt = new Date();
    const delayMs = cronManager.findDelayMs(cronExpression);

    // Assert

    expect(isValidCron).toBeTruthy();
    expect(nextRunAt).toBeInstanceOf(Date);
    expect(delayMs).toBe(50000);

    expect(jobRepo.create).toHaveBeenCalledWith(
      createJobEntity,
      "sdjdn32e233",
      nextRunAt,
      null,
    );

    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "sdjdn32e233" }),
      "job created",
    );
    expect(scheduler.scheduleJob).toHaveBeenCalledWith(
      userDTO.jobId,
      "sdjdn32e233",
      50000,
      mockLog,
    );

    expect(result).toMatchObject(jobResponseForUser);
  });

  // FIND JOB + USER (drizzle join for the notification worker)

  it("should return job+user keyed by table name from the drizzle join", async () => {
    //Arrange — drizzle keys joined rows by DB table name ({ job, users })
    const dbUser = {
      id: userDTO.userId,
      name: "Emma",
      email: "emma@example.com",
      emailVerified: true,
      image: null,
    } as User;
    const joined = { job: returnedJobFromDb, users: dbUser };
    jobRepo.findOneAndJoinUser.mockResolvedValue(joined);

    //Act
    const result = await jobService.findJobAndUser(userDTO.jobId, mockLog);

    //Assert
    expect(jobRepo.findOneAndJoinUser).toHaveBeenCalledWith(userDTO.jobId);
    expect(result).toEqual(joined);
  });

  it("should throw UnrecoverableError when the joined job is missing", async () => {
    //Arrange
    jobRepo.findOneAndJoinUser.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      jobService.findJobAndUser(userDTO.jobId, mockLog),
    ).rejects.toThrow(UnrecoverableError);
  });
});

import {
  type createNotificationDTO,
  type NotificationEvent,
  type updateNotificationDTO,
  type notificationResponseDTO,
  type queueDTO,
} from "./notification.types.js";
import type { NotificationRepository } from "./notification.repository.js";
import type { JobService } from "../Jobs/job.service.js";
import type {
  Notification,
  Notification as NotificationEntity,
} from "../../shared/types/entities.js";
import type { SharedCacheRepository } from "../../shared/repositories/cache.repository.js";
import {
  NotFoundError,
  PermissionError,
} from "../../shared/errors/business.errors.js";
import {
  resolvePagination,
  toPaginated,
  type PaginatedResponse,
  type PaginationParams,
} from "../../shared/types/pagination.js";
import type { Logger } from "pino";
import { NotificationQueue } from "./notification.queue.js";
import { UnrecoverableError } from "bullmq";

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private jobService: JobService;
  private cacheRepo: SharedCacheRepository;
  private queue: NotificationQueue;

  constructor(
    notificationRepo: NotificationRepository,
    jobService: JobService,
    cacheRepo: SharedCacheRepository,
    queue: NotificationQueue,
  ) {
    this.notificationRepo = notificationRepo;
    this.jobService = jobService;
    this.cacheRepo = cacheRepo;
    this.queue = queue;
  }

  async notify(
    jobId: number,
    executionId: number,
    event: NotificationEvent,
    userId: string,
    log: Logger,
  ): Promise<void> {
    //Drop matching notifications (by outcome event) into notification queue
    const notifications = await this.notificationRepo.findAllByJobIdAndEvent(
      jobId,
      event,
    );

    if (!notifications.length) {
      log.warn(
        { jobId, executionId, event, userId, filename: "notification.service.ts", functionname: "NotificationService.notify" },
        "no notifications to send",
      );
      return;
    }

    for (const notification of notifications) {
      if (!notification.enabled) {
        log.warn(
          {
            notificationId: notification.id,
            jobId,
            executionId,
            event,
            filename: "notification.service.ts",
            functionname: "NotificationService.notify",
          },
          "notification not enabled, skipping",
        );
        continue;
      }
      const notifId = `notif-${notification.id}`;
      const queueData: queueDTO = {
        userId,
        notificationId: notifId,
        executionId,
        event,
      };
      await this.queue.add(queueData);
      log.info(
        {
          notificationId: notification.id,
          queueId: `${notifId}-exec-${executionId}`,
          jobId,
          executionId,
          event,
          filename: "notification.service.ts",
          functionname: "NotificationService.notify",
        },
        "notification queued",
      );
    }
  }

  async create(
    jobId: number,
    data: createNotificationDTO,
    userId: string,
    log: Logger,
  ): Promise<notificationResponseDTO> {
    const job = await this.jobService.findJobSystem(jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.create" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    const created = (await this.notificationRepo.create(
      data,
      jobId,
    )) as NotificationEntity;

    log.info(
      {
        notificationId: created.id,
        jobId: jobId,
        type: created.type,
        filename: "notification.service.ts",
        functionname: "NotificationService.create",
      },
      "notification created",
    );

    return this.toResponseDTO(created);
  }

  async findOne(
    notificationId: number,
    userId: string,
    log: Logger,
  ): Promise<notificationResponseDTO> {
    // Check cache exists else fetch from db
    const cacheKey = `notification:${notificationId}`;
    const cacheData = await this.cacheRepo.get<NotificationEntity>(cacheKey);

    if (cacheData) {
      return this.toResponseDTO(cacheData);
    }

    const fetched = (await this.notificationRepo.findById(
      notificationId,
    )) as NotificationEntity;

    if (!fetched) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.findOne" }, "notification not found");
      throw new NotFoundError();
    }

    const job = await this.jobService.findJobSystem(fetched.jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId: fetched.jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.findOne" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    await this.cacheRepo.set(`notification:${fetched?.id}`, fetched);

    // Return to user
    return this.toResponseDTO(fetched);
  }
  async findOneSystem(
    notificationId: number,
    log: Logger,
  ): Promise<Notification> {
    const fetched = (await this.notificationRepo.findById(
      notificationId,
    )) as NotificationEntity;

    if (!fetched) {
      log.error({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.findOneSystem" }, "notification not found by system");
      throw new UnrecoverableError();
    }

    return fetched;
  }

  async findAllByJob(
    jobId: number,
    { page, limit }: PaginationParams,
    userId: string,
    log: Logger,
  ): Promise<PaginatedResponse<notificationResponseDTO>> {
    // Ownership first — the list must never leak across users
    const job = await this.jobService.findJobSystem(jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.findAllByJob" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    const { offset } = resolvePagination({ page, limit });

    const [fetched, total] = await Promise.all([
      this.notificationRepo.findAllByJobId(jobId, limit, offset),
      this.notificationRepo.countByJobId(jobId),
    ]);

    const data = fetched.map((item) => this.toResponseDTO(item));

    // Return to user
    return toPaginated(data, total, { page, limit });
  }

  async toggleEnabled(
    notificationId: number,
    userId: string,
    log: Logger,
  ): Promise<notificationResponseDTO> {
    const fetched = (await this.notificationRepo.findById(
      notificationId,
    )) as NotificationEntity;

    if (!fetched) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.toggleEnabled" }, "notification not found");
      throw new NotFoundError();
    }

    const job = await this.jobService.findJobSystem(fetched.jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId: fetched.jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.toggleEnabled" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    const updated = await this.notificationRepo.toggleEnabled(notificationId);

    if (!updated) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.toggleEnabled" }, "notification not found");
      throw new NotFoundError();
    }

    this.invalidateCache(notificationId);

    return this.toResponseDTO(updated);
  }

  async update(
    notificationId: number,
    updateDTO: updateNotificationDTO,
    userId: string,
    log: Logger,
  ): Promise<notificationResponseDTO> {
    const fetched = (await this.notificationRepo.findById(
      notificationId,
    )) as NotificationEntity;

    if (!fetched) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.update" }, "notification not found");
      throw new NotFoundError();
    }

    const job = await this.jobService.findJobSystem(fetched.jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId: fetched.jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.update" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    const [updated] = await this.notificationRepo.update(
      notificationId,
      updateDTO,
    );

    if (!updated) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.update" }, "notification not found");
      throw new NotFoundError();
    }

    this.invalidateCache(notificationId);

    return this.toResponseDTO(updated);
  }

  async delete(notificationId: number, userId: string, log: Logger) {
    const fetched = await this.notificationRepo.findById(notificationId);

    if (!fetched) {
      log.warn({ notificationId, filename: "notification.service.ts", functionname: "NotificationService.delete" }, "notification not found");
      throw new NotFoundError();
    }

    const job = await this.jobService.findJobSystem(fetched.jobId, log);
    if (job.userId !== userId) {
      log.warn({ jobId: fetched.jobId, userId, filename: "notification.service.ts", functionname: "NotificationService.delete" }, "job doesn't belong to user");
      throw new PermissionError();
    }

    this.invalidateCache(notificationId);

    await this.notificationRepo.delete(notificationId);
  }

  private invalidateCache(notificationId: number) {
    void this.cacheRepo.delete(`notification:${notificationId}`);
  }

  private toResponseDTO(entity: NotificationEntity): notificationResponseDTO {
    return {
      id: entity.id,
      jobId: entity.jobId,
      type: entity.type,
      event: entity.event,
      target: entity.target,
      enabled: entity.enabled,
    };
  }
}

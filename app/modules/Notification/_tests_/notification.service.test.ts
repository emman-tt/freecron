import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Job, Notification } from "../../../shared/types/entities.js";
import type {
  createNotificationDTO,
  notificationResponseDTO,
  updateNotificationDTO,
  NotificationEvent,
} from "../notification.types.js";
import { NotificationService } from "../notification.service.js";
import type { NotificationRepository } from "../notification.repository.js";
import type { JobService } from "../../Jobs/job.service.js";
import type { SharedCacheRepository } from "../../../shared/repositories/cache.repository.js";
import type { NotificationQueue } from "../notification.queue.js";
import {
  NotFoundError,
  PermissionError,
} from "../../../shared/errors/business.errors.js";
import { UnrecoverableError } from "bullmq";
import type { Logger } from "pino";

describe("Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userId = "123e4567-e89b-12d3-a456-426614174000";
  const jobId = 9;

  const parentJob = {
    id: jobId,
    userId,
  } as Job;

  const dbNotification = {
    id: 5,
    jobId,
    type: "email",
    event: "failure",
    target: "owner@example.com",
    enabled: true,
  } as Notification;

  const notificationDTO: notificationResponseDTO = {
    id: 5,
    jobId,
    type: "email",
    event: "failure",
    target: "owner@example.com",
    enabled: true,
  };

  const createDTO: createNotificationDTO = {
    type: "email",
    event: "failure",
    target: "owner@example.com",
    channelId: null,
  };

  const notificationRepo = {
    create: jest.fn<
      (data: createNotificationDTO, jobId: number) => Promise<Notification>
    >(),
    findById: jest.fn<(id: number) => Promise<Notification | undefined>>(),
    findAllByJobId: jest.fn<
      (jobId: number, limit: number, offset: number) => Promise<Notification[]>
    >(),
    findAllByJobIdAndEvent: jest.fn<
      (jobId: number, event: NotificationEvent) => Promise<Notification[]>
    >(),
    countByJobId: jest.fn<(jobId: number) => Promise<number>>(),
    toggleEnabled: jest.fn<(id: number) => Promise<Notification | undefined>>(),
    delete: jest.fn<(id: number) => Promise<void>>(),
    update: jest.fn<
      (id: number, dto: updateNotificationDTO) => Promise<Notification[]>
    >(),
  };

  const queue = {
    add: jest.fn<(data: unknown) => Promise<unknown>>(),
  };

  const jobService = {
    findJobSystem: jest.fn<(jobId: number, log: Logger) => Promise<Job>>(),
  };

  const cacheRepo = {
    delete: jest.fn<(key: string) => Promise<void>>(),
    get: jest.fn<(key: string) => Promise<unknown>>(),
    set: jest.fn<
      (key: string, value: unknown, ttl?: number) => Promise<void>
    >(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const notificationService = new NotificationService(
    notificationRepo as unknown as NotificationRepository,
    jobService as unknown as JobService,
    cacheRepo as unknown as SharedCacheRepository,
    queue as unknown as NotificationQueue,
  );

  // CREATE

  it("should create an email notification for the job owner", async () => {
    //Arrange
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.create.mockResolvedValue(dbNotification);

    //Act
    const result = await notificationService.create(
      jobId,
      createDTO,
      userId,
      mockLog,
    );

    //Assert
    expect(notificationRepo.create).toHaveBeenCalledWith(createDTO, jobId);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: 5, jobId }),
      "notification created",
    );
    expect(result).toEqual(notificationDTO);
  });

  it("should create a slack notification with a webhook target", async () => {
    //Arrange
    const slackDTO: createNotificationDTO = {
      type: "slack",
      event: "success",
      target: "https://hooks.slack.com/services/T/B/X",
      channelId: "C012AB345CD",
    };
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.create.mockResolvedValue({
      ...dbNotification,
      type: "slack",
      event: "success",
      target: slackDTO.target,
    });

    //Act
    const result = await notificationService.create(
      jobId,
      slackDTO,
      userId,
      mockLog,
    );

    //Assert
    expect(notificationRepo.create).toHaveBeenCalledWith(slackDTO, jobId);
    expect(result).toMatchObject({
      type: "slack",
      event: "success",
      target: slackDTO.target,
    });
  });

  it("should reject creation for a job owned by someone else", async () => {
    //Arrange
    jobService.findJobSystem.mockResolvedValue({ ...parentJob, userId: "other" });

    //Act + Assert
    await expect(
      notificationService.create(jobId, createDTO, userId, mockLog),
    ).rejects.toThrow(PermissionError);
    expect(notificationRepo.create).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it("should propagate when the parent job does not exist", async () => {
    //Arrange
    jobService.findJobSystem.mockRejectedValue(
      new UnrecoverableError("job not found"),
    );

    //Act + Assert
    await expect(
      notificationService.create(jobId, createDTO, userId, mockLog),
    ).rejects.toThrow(UnrecoverableError);
    expect(notificationRepo.create).not.toHaveBeenCalled();
  });

  // FIND ONE

  it("should return a notification from cache without hitting db", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(dbNotification);

    //Act
    const result = await notificationService.findOne(5, userId, mockLog);

    //Assert
    expect(cacheRepo.get).toHaveBeenCalledWith("notification:5");
    expect(notificationRepo.findById).not.toHaveBeenCalled();
    expect(result).toEqual(notificationDTO);
  });

  it("should find a notification from db and cache it on miss", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    notificationRepo.findById.mockResolvedValue(dbNotification);
    jobService.findJobSystem.mockResolvedValue(parentJob);

    //Act
    const result = await notificationService.findOne(5, userId, mockLog);

    //Assert
    expect(notificationRepo.findById).toHaveBeenCalledWith(5);
    expect(cacheRepo.set).toHaveBeenCalledWith(
      "notification:5",
      dbNotification,
    );
    expect(result).toEqual(notificationDTO);
  });

  it("should throw when the notification does not exist", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    notificationRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      notificationService.findOne(5, userId, mockLog),
    ).rejects.toThrow(NotFoundError);
  });

  it("should reject a notification owned through another user", async () => {
    //Arrange
    cacheRepo.get.mockResolvedValue(null);
    notificationRepo.findById.mockResolvedValue(dbNotification);
    jobService.findJobSystem.mockResolvedValue({ ...parentJob, userId: "other" });

    //Act + Assert
    await expect(
      notificationService.findOne(5, userId, mockLog),
    ).rejects.toThrow(PermissionError);
    expect(cacheRepo.set).not.toHaveBeenCalled();
  });

  // FIND ALL

  it("should list notifications for a job with pagination", async () => {
    //Arrange
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.findAllByJobId.mockResolvedValue([dbNotification]);
    notificationRepo.countByJobId.mockResolvedValue(1);

    //Act
    const result = await notificationService.findAllByJob(
      jobId,
      { page: 1, limit: 20 },
      userId,
      mockLog,
    );

    //Assert
    expect(notificationRepo.findAllByJobId).toHaveBeenCalledWith(jobId, 20, 0);
    expect(notificationRepo.countByJobId).toHaveBeenCalledWith(jobId);
    expect(result.data).toEqual([notificationDTO]);
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it("should reject listing for a job owned by someone else", async () => {
    //Arrange
    jobService.findJobSystem.mockResolvedValue({ ...parentJob, userId: "other" });

    //Act + Assert
    await expect(
      notificationService.findAllByJob(jobId, { page: 1, limit: 20 }, userId, mockLog),
    ).rejects.toThrow(PermissionError);
    expect(notificationRepo.findAllByJobId).not.toHaveBeenCalled();
  });

  // TOGGLE

  it("should toggle a notification and invalidate its cache", async () => {
    //Arrange
    notificationRepo.findById.mockResolvedValue(dbNotification);
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.toggleEnabled.mockResolvedValue({
      ...dbNotification,
      enabled: false,
    });

    //Act
    const result = await notificationService.toggleEnabled(5, userId, mockLog);

    //Assert
    expect(notificationRepo.toggleEnabled).toHaveBeenCalledWith(5);
    expect(cacheRepo.delete).toHaveBeenCalledWith("notification:5");
    expect(result).toMatchObject({ ...notificationDTO, enabled: false });
  });

  it("should throw when toggling a missing notification", async () => {
    //Arrange
    notificationRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      notificationService.toggleEnabled(5, userId, mockLog),
    ).rejects.toThrow(NotFoundError);
  });

  // UPDATE

  it("should update a notification and invalidate its cache", async () => {
    //Arrange
    const update = { event: "success" } as const;
    const updated = { ...dbNotification, event: "success" } as Notification;
    notificationRepo.findById.mockResolvedValue(dbNotification);
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.update.mockResolvedValue([updated]);

    //Act
    const result = await notificationService.update(
      5,
      { ...update },
      userId,
      mockLog,
    );

    //Assert
    expect(notificationRepo.update).toHaveBeenCalledWith(5, update);
    expect(cacheRepo.delete).toHaveBeenCalledWith("notification:5");
    expect(result).toMatchObject({ ...notificationDTO, event: "success" });
  });

  // DELETE

  it("should delete a notification and invalidate its cache", async () => {
    //Arrange
    notificationRepo.findById.mockResolvedValue(dbNotification);
    jobService.findJobSystem.mockResolvedValue(parentJob);
    notificationRepo.delete.mockResolvedValue(undefined);

    //Act
    await notificationService.delete(5, userId, mockLog);

    //Assert
    expect(notificationRepo.delete).toHaveBeenCalledWith(5);
    expect(cacheRepo.delete).toHaveBeenCalledWith("notification:5");
  });

  it("should throw when deleting a missing notification", async () => {
    //Arrange
    notificationRepo.findById.mockResolvedValue(undefined);

    //Act + Assert
    await expect(
      notificationService.delete(5, userId, mockLog),
    ).rejects.toThrow(NotFoundError);
    expect(notificationRepo.delete).not.toHaveBeenCalled();
  });

  // NOTIFY

  it("should queue each enabled rule matching the outcome event", async () => {
    //Arrange
    const slackRule = {
      ...dbNotification,
      id: 6,
      type: "slack",
      target: "https://hooks.slack.com/services/T/B/X",
    } as Notification;
    notificationRepo.findAllByJobIdAndEvent.mockResolvedValue([
      dbNotification,
      slackRule,
    ]);
    queue.add.mockResolvedValue(undefined);

    //Act
    await notificationService.notify(jobId, 42, "failure", userId, mockLog);

    //Assert
    expect(notificationRepo.findAllByJobIdAndEvent).toHaveBeenCalledWith(
      jobId,
      "failure",
    );
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith({
      userId,
      notificationId: "notif-5",
      executionId: 42,
      event: "failure",
    });
    expect(queue.add).toHaveBeenCalledWith({
      userId,
      notificationId: "notif-6",
      executionId: 42,
      event: "failure",
    });
  });

  it("should return early when no rules match the outcome event", async () => {
    //Arrange
    notificationRepo.findAllByJobIdAndEvent.mockResolvedValue([]);

    //Act
    await notificationService.notify(jobId, 42, "success", userId, mockLog);

    //Assert
    expect(queue.add).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId, event: "success" }),
      "no notifications to send",
    );
  });

  it("should skip disabled rules but queue the enabled ones", async () => {
    //Arrange
    notificationRepo.findAllByJobIdAndEvent.mockResolvedValue([
      { ...dbNotification, enabled: false },
      dbNotification,
    ]);
    queue.add.mockResolvedValue(undefined);

    //Act
    await notificationService.notify(jobId, 7, "failure", userId, mockLog);

    //Assert
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith({
      userId,
      notificationId: "notif-5",
      executionId: 7,
      event: "failure",
    });
  });
});

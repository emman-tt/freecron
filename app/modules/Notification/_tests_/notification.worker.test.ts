import {
  afterAll,
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { UnrecoverableError, type Job as BullJob } from "bullmq";
import type { Logger } from "pino";
import type {
  Execution,
  Job,
  Notification,
  User,
} from "../../../shared/types/entities.js";
import type { NotificationService } from "../notification.service.js";
import type { JobService } from "../../Jobs/job.service.js";
import type { ExecutionService } from "../../Execution/execution.service.js";
import { NotificationWorker } from "../notification.worker.js";
import { resend } from "../../../shared/lib/mail.service.js";
import { slack } from "../../../shared/lib/slack.service.js";
import {
  CleanTestInfra,
  redis,
  SetupTestInfra,
  TeardownTestInfra,
} from "../../../shared/helpers/test-setup.js";

describe("Notification Worker", () => {
  const userId = "123e4567-e89b-12d3-a456-426614174000";

  const dbUser = {
    id: userId,
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
  } as User;

  const dbJob = {
    id: 9,
    userId,
    name: "Nightly Backup",
    description: null,
    cronExpression: "0 2 * * *",
    httpHeader: {},
    httpCommand: "https://api.example.com/backup",
    httpMethod: "POST",
    httpBody: {},
    isActive: true,
    maxRetries: 3,
    retryDelay: 3000,
    timeout: 30000,
    lastRunAt: null,
    nextRunAt: new Date("2026-10-16T02:00:00.000Z"),
  } as Job;

  const successExecution = {
    id: 42,
    jobId: 9,
    status: "success",
    startedAt: new Date("2026-10-15T02:00:00.000Z"),
    statusCode: 200,
    completedAt: new Date("2026-10-15T02:00:01.100Z"),
    duration: 1100,
    error: null,
    response: { headers: {}, body: { ok: true } },
  } as Execution;

  const failedExecution = {
    ...successExecution,
    status: "failed",
    statusCode: 500,
    duration: 30000,
    completedAt: new Date("2026-10-15T02:00:30.000Z"),
    error: "ECONNABORTED",
  } as Execution;

  function notification(overrides: Partial<Notification> = {}): Notification {
    return {
      id: 5,
      jobId: 9,
      type: "email",
      event: "success",
      target: "owner@example.com",
      channelId: null,
      enabled: true,
      ...overrides,
    } as Notification;
  }

  function queueJob(notificationId: string, executionId: number | undefined) {
    return {
      data: { notificationId, userId, executionId },
    } as unknown as BullJob;
  }

  const notifService = {
    findOneSystem:
      jest.fn<(id: number, log: Logger) => Promise<Notification>>(),
  };

  const jobService = {
    findJobAndUser:
      jest.fn<
        (id: number, log: Logger) => Promise<{ job: Job; users: User }>
      >(),
  };

  const executionService = {
    findOneSystem: jest.fn<(id: number, log: Logger) => Promise<Execution>>(),
  };

  let worker: NotificationWorker;

  function sentEmail(): { html: string; subject: string; to: string[] } {
    const arg = (resend.emails.send as jest.Mock).mock.calls[0]?.[0];
    return arg as unknown as { html: string; subject: string; to: string[] };
  }

  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    jest.clearAllMocks();
    jest
      .spyOn(resend.emails, "send")
      .mockResolvedValue({ data: { id: "email-1" }, error: null } as Awaited<
        ReturnType<typeof resend.emails.send>
      >);
    jest.spyOn(slack.chat, "postMessage").mockResolvedValue({
      ok: true,
      channel: "C012AB345CD",
      ts: "1234567890.123456",
    } as unknown as Awaited<ReturnType<typeof slack.chat.postMessage>>);
    worker = new NotificationWorker(
      redis,
      notifService as unknown as NotificationService,
      jobService as unknown as JobService,
      executionService as unknown as ExecutionService,
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await worker.close();
  });

  afterAll(async () => {
    await TeardownTestInfra();
  });

  it("should send a customized success email and skip slack", async () => {
    //Arrange
    notifService.findOneSystem.mockResolvedValue(notification());
    jobService.findJobAndUser.mockResolvedValue({ job: dbJob, users: dbUser });
    executionService.findOneSystem.mockResolvedValue(successExecution);

    //Act
    await worker.Processor(queueJob("notif-5", 42));

    //Assert
    expect(resend.emails.send).toHaveBeenCalledTimes(1);
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["owner@example.com"],
        subject: "[FreeCron] Success: Nightly Backup (200, 1.1s)",
      }),
    );
    expect(sentEmail().html).toContain("All good: Nightly Backup ran in 1100");
    expect(slack.chat.postMessage).not.toHaveBeenCalled();
  });

  it("should send a failure email with error, command and formatted timeout", async () => {
    //Arrange
    notifService.findOneSystem.mockResolvedValue(
      notification({ event: "failure" }),
    );
    jobService.findJobAndUser.mockResolvedValue({ job: dbJob, users: dbUser });
    executionService.findOneSystem.mockResolvedValue(failedExecution);

    //Act
    await worker.Processor(queueJob("notif-5", 42));

    //Assert
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[FreeCron] Failed: Nightly Backup (500)",
      }),
    );
    const html = sentEmail().html;
    expect(html).toContain("ECONNABORTED");
    expect(html).toContain("https://api.example.com/backup");
    expect(html).toContain("(limit");
    expect(html).toContain("30s)");
    expect(slack.chat.postMessage).not.toHaveBeenCalled();
  });

  it("should post to the slack channel and skip email", async () => {
    //Arrange
    notifService.findOneSystem.mockResolvedValue(
      notification({ id: 6, type: "slack", channelId: "C012AB345CD" }),
    );
    jobService.findJobAndUser.mockResolvedValue({ job: dbJob, users: dbUser });
    executionService.findOneSystem.mockResolvedValue(successExecution);

    //Act
    await worker.Processor(queueJob("notif-6", 42));

    //Assert
    expect(slack.chat.postMessage).toHaveBeenCalledTimes(1);
    expect(slack.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "C012AB345CD",
        text: "All good: Nightly Backup ran in 1.1s (200)",
      }),
    );
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("should throw UnrecoverableError when executionId is missing", async () => {
    //Act + Assert
    await expect(
      worker.Processor(queueJob("notif-5", undefined)),
    ).rejects.toThrow(UnrecoverableError);
    expect(notifService.findOneSystem).not.toHaveBeenCalled();
    expect(resend.emails.send).not.toHaveBeenCalled();
    expect(slack.chat.postMessage).not.toHaveBeenCalled();
  });
});

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { QueueEvents } from "bullmq";
import { eq } from "drizzle-orm";

import { ScheduleWorker } from "../schedular.worker.js";
import { ScheduleQueue } from "../schedular.queue.js";
import {
  CleanTestInfra,
  createJobTest,
  createUserTest,
  db,
  redis,
  SetupTestInfra,
  TeardownTestInfra,
} from "../../../shared/helpers/test-setup.js";
import { JobService } from "../../Jobs/job.service.js";
import { ExecutionService } from "../../Execution/execution.service.js";
import { executionRepo } from "../../Execution/execution.repository.js";
import { jobRepo } from "../../Jobs/job.repository.js";
import { cronManager } from "../../../shared/lib/cron.service.js";
import { SharedCacheRepository } from "../../../shared/repositories/cache.repository.js";
import { SchedularService } from "../schedular.service.js";
import type { queueDTO } from "../schedular.types.js";
import { notificationRepo } from "../../Notification/notification.repository.js";
import { NotificationQueue } from "../../Notification/notification.queue.js";
import { NotificationService } from "../../Notification/notification.service.js";
import type { Job as JobType } from "../../../shared/types/entities.js";
import { JOB_DEFUALTS } from "../../Jobs/job.defaults.js";
import { Job } from "../../../database/db.schema.js";

const WAIT_TTL = 10000;
const JOB_TIMEOUT = 50;

function buildJobEntity(userId: string): JobType {
  return {
    name: "astroverse",
    cronExpression: "*/5 * * * *",
    lastRunAt: null,
    nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
    httpCommand: "https://google.com",
    httpMethod: "PATCH",
    userId,
    timeout: JOB_DEFUALTS.timeout,
    isActive: JOB_DEFUALTS.isActive,
    description: JOB_DEFUALTS.description,
    maxRetries: JOB_DEFUALTS.maxRetries,
    retryDelay: JOB_DEFUALTS.retryDelay,
    httpBody: JOB_DEFUALTS.httpBody,
    httpHeader: JOB_DEFUALTS.httpHeader,
  };
}

describe("Worker integration test", () => {
  let worker: ScheduleWorker;
  let jobService: JobService;
  let executionService: ExecutionService;
  let cacheRepo: SharedCacheRepository;
  let schedular: SchedularService;
  let scheduleQueue: ScheduleQueue;
  let queueEvents: QueueEvents;
  let notificationService: NotificationService;
  let notifQueue: NotificationQueue;

  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    //Give the wrappers a connection they own (close() quits it) so the
    //shared test redis stays usable for fixtures and teardown
    queueEvents = new QueueEvents("schedular", { connection: redis });
    cacheRepo = new SharedCacheRepository(redis);
    scheduleQueue = new ScheduleQueue(redis.duplicate());
    schedular = new SchedularService(scheduleQueue, cronManager, jobRepo);
    jobService = new JobService(jobRepo, cronManager, cacheRepo, schedular);
    executionService = new ExecutionService(executionRepo, jobService);
    notifQueue = new NotificationQueue(redis.duplicate());
    notificationService = new NotificationService(
      notificationRepo,
      jobService,
      cacheRepo,
      notifQueue,
    );
    worker = new ScheduleWorker(
      redis.duplicate(),
      jobService,
      executionService,
      notificationService,
    );
  });

  afterEach(async () => {
    await worker.close();
    await queueEvents.close();
    await scheduleQueue.close();
    await notifQueue.close();
  });

  afterAll(async () => {
    await TeardownTestInfra();
  });

  it(
    "should test the success lifecycle of a job through the worker",
    async () => {
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      fetchMock.mockResponse(
        JSON.stringify({ success: true, data: "test - 101" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

      const queuedJob = await scheduleQueue.add(queueJob);

      //Assert
      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      const [record] = await executionRepo.findAllByJobId(job!.id, 20, 0);

      const [updatedJob] = await db
        .select()
        .from(Job)
        .where(eq(Job.id, job!.id));

      const duration =
        record!.completedAt!.getTime() - record!.startedAt.getTime();

      expect(record).toBeDefined();
      expect(record).toHaveProperty("jobId", job?.id);
      expect(record?.statusCode).toEqual(200);
      expect(record?.status).toBe("success");
      expect(record?.response?.body).toMatchObject({
        success: true,
        data: "test - 101",
      });
      expect(record?.duration).toEqual(duration);
      expect(updatedJob?.lastRunAt).toBeTruthy();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should test the failure lifecycle of a job through the worker http 4xxx/5xx",
    async () => {
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      // Persistent so every attempt gets a 500; the job is retried until attempts
      // are exhausted and only then does the failed event fire.
      fetchMock.mockResponse(
        JSON.stringify({ success: false, error: " http 4xx/5xx error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );

      const queuedJob = await scheduleQueue.add(queueJob);

      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const records = await executionRepo.findAllByJobId(job!.id, 20, 0);
      const [updatedJob] = await db
        .select()
        .from(Job)
        .where(eq(Job.id, job!.id));

      //Assert

      expect(fetchMock.mock.calls.length).toBe(queuedJob.opts.attempts);
      const failedRecord = records.find((row) => row.status === "failed");
      expect(failedRecord).toBeDefined();
      expect(failedRecord).toHaveProperty("jobId", job?.id);
      expect(failedRecord?.statusCode).toEqual(500);
      expect(failedRecord?.completedAt?.getTime()).toBeGreaterThan(
        failedRecord?.startedAt.getTime()!,
      );
      expect(updatedJob?.lastRunAt).toBeTruthy();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should record a failed job due to network error ",
    async () => {
      // Arrange
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      fetchMock.mockReject(new Error("ECONNREFUSED"));

      //Act
      const queuedJob = await scheduleQueue.add(queueJob);

      //Assert
      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();
      const records = await executionRepo.findAllByJobId(job!.id, 20, 0);
      const [updatedJob] = await db
        .select()
        .from(Job)
        .where(eq(Job.id, job!.id));

      expect(fetchMock.mock.calls.length).toBe(queuedJob.opts.attempts);
      const failedRecord = records.find((row) => row.status === "failed");
      expect(failedRecord).toBeDefined();
      expect(failedRecord).toHaveProperty("jobId", job?.id);
      expect(failedRecord?.statusCode).toBeFalsy();
      expect(failedRecord?.completedAt?.getTime()).toBeGreaterThan(
        failedRecord?.startedAt.getTime()!,
      );
      expect(updatedJob?.lastRunAt).toBeTruthy();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should abort a request that outlives the job timeout and record the failure",
    async () => {
      // Arrange
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, {
        ...buildJobEntity(user.id),
        timeout: JOB_TIMEOUT,
      });
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      fetchMock.mockResponse(
        (request) =>
          new Promise((_resolve, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(request.signal.reason);
            });
          }),
      );

      //Act
      const startedAt = Date.now();
      const queuedJob = await scheduleQueue.add(queueJob);

      //Assert
      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();
      const elapsed = Date.now() - startedAt;

      const records = await executionRepo.findAllByJobId(job!.id, 20, 0);
      const [updatedJob] = await db
        .select()
        .from(Job)
        .where(eq(Job.id, job!.id));

      // Every attempt was cut short by the signal rather than by the server.
      expect(fetchMock.mock.calls.length).toBe(queuedJob.opts.attempts);
      // The whole job finished well inside the wait window instead of hanging
      // until it, which is what proves the timeout is actually applied.
      expect(elapsed).toBeLessThan(WAIT_TTL);

      const failedRecord = records.find((row) => row.status === "failed");
      expect(failedRecord).toBeDefined();
      expect(failedRecord).toHaveProperty("jobId", job?.id);
      expect(failedRecord?.statusCode).toBeFalsy();
      expect(failedRecord?.error).toMatch(/abort|timeout/i);
      expect(failedRecord?.completedAt?.getTime()).toBeGreaterThan(
        failedRecord?.startedAt.getTime()!,
      );
      expect(updatedJob?.lastRunAt).toBeTruthy();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should record a success when a job fails once and succeeds on retry",
    async () => {
      // Arrange
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      // First attempt dies, the retry succeeds. Attempt 1 is not the last one
      // (attemptsStarted 1 < attempts 2), so the Processor rethrows without
      let attempt = 0;
      fetchMock.mockResponses(
        () => {
          attempt += 1;
          return Promise.reject(new Error("ECONNRESET"));
        },
        () => {
          attempt += 1;
          return new Response(
            JSON.stringify({ success: true, data: "recovered" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      );

      //Act
      const queuedJob = await scheduleQueue.add(queueJob);

      //Assert
      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      const records = await executionRepo.findAllByJobId(job!.id, 20, 0);
      const [updatedJob] = await db
        .select()
        .from(Job)
        .where(eq(Job.id, job!.id));

      // The job genuinely failed first and was then retried.
      expect(attempt).toBe(2);
      expect(fetchMock.mock.calls.length).toBe(queuedJob.opts.attempts);

      // Only the first attempt opens an execution row: the retry reuses the id
      // persisted through job.updateData rather than creating a second row.
      expect(records).toHaveLength(1);
      const [record] = records;
      expect(record).toHaveProperty("jobId", job?.id);
      expect(record?.status).toBe("success");
      expect(record?.statusCode).toEqual(200);
      expect(record?.error).toBeNull();
      expect(record?.response?.body).toMatchObject({
        success: true,
        data: "recovered",
      });
      expect(updatedJob?.lastRunAt).toBeTruthy();
    },
    WAIT_TTL + 5000,
  );

  // NOTIFY FAN-OUT (real NotificationService + real notification queue)

  async function waitForNotification(notificationId: string, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const jobs = await notifQueue
        .getQueue()
        .getJobs(["waiting", "delayed", "active", "prioritized"]);
      const found = jobs.find((j) => j.data?.notificationId === notificationId);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`notification ${notificationId} was never queued`);
  }

  it(
    "should queue a success notification with the execution snapshot after a successful run",
    async () => {
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const rule = await notificationRepo.create(
        {
          type: "email",
          event: "success",
          target: "owner@example.com",
          channelId: null,
        },
        job?.id as number,
      );
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      fetchMock.mockResponse(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      const queuedJob = await scheduleQueue.add(queueJob);

      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      const [record] = await executionRepo.findAllByJobId(job!.id, 20, 0);
      expect(record?.status).toBe("success");

      // The completed listener fans out through the real service + queue
      const notifJob = await waitForNotification(`notif-${rule?.id}`);
      expect(notifJob.data).toMatchObject({
        userId: user.id,
        executionId: record?.id,
        event: "success",
      });
    },
    WAIT_TTL + 5000,
  );

  it(
    "should queue a failure notification with the execution snapshot after terminal failure",
    async () => {
      const user = await createUserTest("Emma");
      const job = await createJobTest(user.id, buildJobEntity(user.id));
      const rule = await notificationRepo.create(
        {
          type: "email",
          event: "failure",
          target: "owner@example.com",
          channelId: null,
        },
        job?.id as number,
      );
      const queueJob: queueDTO = {
        jobId: `cron-${job?.id}`,
        userId: user.id,
        priority: 1,
        delay: 0,
      };

      fetchMock.mockResponse(JSON.stringify({ success: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });

      const queuedJob = await scheduleQueue.add(queueJob);

      await expect(
        queuedJob.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const records = await executionRepo.findAllByJobId(job!.id, 20, 0);
      const failedRecord = records.find((row) => row.status === "failed");
      expect(failedRecord).toBeDefined();

      // Same BullMQ jobId (notif-<id>-exec-<execId>) dedupes any per-attempt
      // fan-out into a single queued notification for the terminal failure
      const notifJob = await waitForNotification(`notif-${rule?.id}`);
      expect(notifJob.data).toMatchObject({
        userId: user.id,
        executionId: failedRecord?.id,
        event: "failure",
      });
    },
    WAIT_TTL + 5000,
  );
});

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { QueueEvents, type Job as BullJob } from "bullmq";
import request from "supertest";
import { eq, desc } from "drizzle-orm";
import { app } from "../index.js";
import { closeInfra, scheduleQueue } from "../infra.js";
import { NotificationQueue } from "../modules/Notification/notification.queue.js";
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
  db,
  redis,
} from "../shared/helpers/test-setup.js";
import { Job, Execution } from "../database/db.schema.js";

type Agent = ReturnType<typeof request.agent>;

//Job failure lifecycle — terminal outcomes through the run-now surface.
//Attempts are 2 under NODE_ENV=test (D-9), so every terminal failure is
//"attempt 1 fails, attempt 2 fails". Notification rules are created via the
//real API; the notification queue is observed, delivery is a separate surface
declare const fetchMock: {
  mockResponse: (body: unknown, init?: unknown) => unknown;
  mockReject: (error: unknown) => unknown;
  mockResponses: (...resolvers: unknown[]) => unknown;
  mock: { calls: unknown[] };
};

const WAIT_TTL = 10000;
const RULE_TARGET = "owner@example.com";

const CREATE_PAYLOAD = {
  name: "failure-target",
  cronExpression: "0 0 1 1 *",
  httpMethod: "GET",
  description: "job failure e2e",
  httpBody: {},
  httpHeader: {},
  httpCommand: "https://mock-target.test/fired",
};

describe("Job Failure Lifecycle", () => {
  let agent: Agent;
  let queueEvents: QueueEvents;
  let notifQueue: NotificationQueue;

  beforeAll(async () => {
    await SetupTestInfra();
    queueEvents = new QueueEvents("schedular", { connection: redis });
    //Observation handle for the notification fan-out; same queue name as the
    //app so entries written by notify() are visible here. Owns its connection
    notifQueue = new NotificationQueue(redis.duplicate());
  });

  beforeEach(async () => {
    await CleanTestInfra();
    agent = request.agent(app);
    //User is created and session is persisted for each test
    await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: "caller@gmail.com",
      password: "abcd1234$",
    });
  });

  afterAll(async () => {
    await queueEvents.close();
    await notifQueue.close();
    await TeardownTestInfra();
    await closeInfra();
  });

  //Run-now triggers carry unique bull ids cron-<id>-runnow-<ts> (D-10) and
  //queue.add is fire-and-forget, so the handle has to be found after the POST
  //with a bounded wait. The payload check binds the entry to this DB job; the
  //id check rules out this job's own scheduled cron-<id> entry
  async function findRunNowTrigger(jobId: number): Promise<BullJob> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const jobs = await scheduleQueue
        .getQueue()
        .getJobs(["waiting", "active", "prioritized"]);
      const found = jobs.find(
        (job) =>
          job?.data?.jobId === `cron-${jobId}` &&
          String(job?.id).includes("-runnow-"),
      );
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(
      `run-now trigger for cron-${jobId} never reached the queue`,
    );
  }

  //Delivery itself is a separate surface — the notification worker is not
  //running under NODE_ENV=test, so the queued entry is the observable
  async function waitForNotification(notificationId: string) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const jobs = await notifQueue
        .getQueue()
        .getJobs(["waiting", "delayed", "active", "prioritized"]);
      const found = jobs.find(
        (job: BullJob | undefined) =>
          job?.data?.notificationId === notificationId,
      );
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`notification ${notificationId} was never queued`);
  }

  async function createJob(agent: Agent) {
    const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
    expect(created.status).toEqual(201);
    return Number(created.body.data.id);
  }

  //A failure rule is the tripwire: only its notified absence/presence,
  //plus the notification queue's traffic, tell the notify story
  async function createFailureRule(agent: Agent, jobId: number) {
    const rule = await agent.post("/api/notifications").send({
      jobId,
      type: "email",
      event: "failure",
      target: RULE_TARGET,
    });
    expect(rule.status).toEqual(201);
    return Number(rule.body.data.id);
  }

  async function latestExecution(jobId: number) {
    const [row] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.jobId, jobId))
      .orderBy(desc(Execution.id))
      .limit(1);
    return row as typeof Execution.$inferSelect | undefined;
  }

  it(
    "should record an HTTP 500 as failed with its status code",
    async () => {
      const jobId = await createJob(agent);

      fetchMock.mockResponse(JSON.stringify({ boom: true }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("failed");
      expect(row?.statusCode).toEqual(500);
      expect(row?.error).toContain("HTTP error");
    },
    WAIT_TTL + 5000,
  );

  it(
    "should record a network error as failed with no status code",
    async () => {
      const jobId = await createJob(agent);

      fetchMock.mockReject(new Error("ECONNREFUSED"));

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("failed");
      //A network error has no HTTP status — 0 is the sentinel, not a status
      expect(row?.statusCode).toEqual(0);
      expect(row?.error).toContain("ECONNREFUSED");
    },
    WAIT_TTL + 5000,
  );

  it(
    "should record a timeout as failed with its reason",
    async () => {
      const jobId = await createJob(agent);

      //Real create schema does not carry timeout — seed the short window
      await db.update(Job).set({ timeout: 50 }).where(eq(Job.id, jobId));

      //Abort-window idiom (schedular.worker.test.ts): the response stays
      //pending until the request is aborted, rejecting with the signal's reason
      fetchMock.mockResponse(
        (request: Request) =>
          new Promise<Response>((_resolve, reject) => {
            request.signal.addEventListener("abort", () => {
              reject(request.signal.reason);
            });
          }),
      );

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("failed");
      //The reason is recorded; 0 is the "no HTTP status" sentinel
      expect(row?.error).toBeTruthy();
      expect(row?.statusCode).toEqual(0);
    },
    WAIT_TTL + 5000,
  );

  it(
    "should not notify on an intermediate failure — attempt 1 fails, no notification",
    async () => {
      const jobId = await createJob(agent);
      const ruleId = await createFailureRule(agent, jobId);

      //Attempt 1 dies, attempt 2 succeeds — the failure is never terminal
      fetchMock.mockResponses(
        () => Promise.reject(new Error("ECONNRESET")),
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          ),
      );

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      //The retry genuinely happened
      expect(fetchMock.mock.calls.length).toEqual(2);

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("success");

      //The tripwire: the failure rule exists but no notification was queued
      const queued = await notifQueue
        .getQueue()
        .getJobs(["waiting", "delayed", "active", "prioritized"]);
      expect(queued).toHaveLength(0);
      void ruleId;
    },
    WAIT_TTL + 5000,
  );

  it(
    "should notify on the final failure",
    async () => {
      const jobId = await createJob(agent);
      const ruleId = await createFailureRule(agent, jobId);

      //Both attempts fail — the failure is terminal
      fetchMock.mockReject(new Error("ECONNREFUSED"));

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).rejects.toThrow();

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("failed");

      //The failure notification is queued with the execution snapshot
      const notifJob = await waitForNotification(`notif-${ruleId}`);
      expect(notifJob.data).toMatchObject({
        event: "failure",
        executionId: row?.id,
      });
    },
    WAIT_TTL + 5000,
  );

  it(
    "should not notify when a retry recovers",
    async () => {
      const jobId = await createJob(agent);
      const ruleId = await createFailureRule(agent, jobId);

      //Attempt 1 fails (HTTP 500), attempt 2 recovers
      fetchMock.mockResponses(
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ boom: true }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          ),
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          ),
      );

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      //Both attempts happened — the recovery is real, not a skipped failure
      expect(fetchMock.mock.calls.length).toEqual(2);

      const row = await latestExecution(jobId);
      expect(row?.status).toEqual("success");
      expect(row?.statusCode).toEqual(200);

      //The failure rule exists but no failure notification was queued
      const queued = await notifQueue
        .getQueue()
        .getJobs(["waiting", "delayed", "active", "prioritized"]);
      expect(queued).toHaveLength(0);
      void ruleId;
    },
    WAIT_TTL + 5000,
  );
});

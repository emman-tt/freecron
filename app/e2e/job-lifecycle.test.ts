import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";
import { app } from "../index.js";
import { scheduleQueue, closeInfra } from "../infra.js";
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
  db,
} from "../shared/helpers/test-setup.js";
import { Job, User, Execution, Notification } from "../database/db.schema.js";
import { eq } from "drizzle-orm";
import type { Job as JobType } from "bullmq";

type Agent = ReturnType<typeof request.agent>;

//Job creation lifecycle — an accepted job must have a truthful response
//payload, a persisted row owned by the caller, and a scheduled BullMQ job

const JOB_PAYLOAD = {
  name: "nightly-backup",
  cronExpression: "0 0 1 1 *",
  httpMethod: "GET",
  description: "job lifecycle e2e",
  httpBody: {},
  httpHeader: {},
  httpCommand: "https://google.com",
};

const CALLER_EMAIL = "caller@gmail.com";

async function findJobInQueue(bullJobId: string) {
  let queuedJob;
  for (let attempt = 0; attempt < 10; attempt++) {
    queuedJob = (await scheduleQueue.getQueue().getJob(bullJobId)) as JobType;
    if (queuedJob) {
      return queuedJob;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe("Job Creation Lifecycle ", () => {
  let agent: Agent;

  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    agent = request.agent(app);
    //User is created and session is persisted for each test
    await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: CALLER_EMAIL,
      password: "abcd1234$",
    });
  });

  afterAll(async () => {
    await TeardownTestInfra();
    await closeInfra();
  });

  it("should create a job — 201 and job exists", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);

    expect(response.status).toEqual(201);
    expect(response.body.status).toEqual("success");
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBeDefined();

    const created = response.body.data;

    expect(created.id).toBeTruthy();

    //DB row exists and belongs to the user
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.email, CALLER_EMAIL));
    const [row] = await db.select().from(Job).where(eq(Job.id, created.id));

    expect(row).toBeDefined();
    expect(row?.userId).toEqual(user?.id);
    expect(row?.userId).not.toBeNull();
  });

  it("should schedule a created job — BullMQ has a delayed job for that jobId", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);
    expect(response.status).toEqual(201);
    const created = response.body.data as { id: number };

    const bullJobId = `cron-${created.id}`;

    //queue.add is fire-and-forget in scheduleJob, so give the write a moment to land in Redis instead of racing it
    let queuedJob;
    for (let attempt = 0; attempt < 10; attempt++) {
      queuedJob = await scheduleQueue.getQueue().getJob(bullJobId);
      if (queuedJob) {
        break; 
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(queuedJob).toBeDefined();
    expect(queuedJob?.data?.jobId).toEqual(bullJobId);
    expect(queuedJob?.data?.userId).toBeDefined();

    //Delayed execution — the job waits for its next cron fire
    expect(await queuedJob?.getState()).toEqual("delayed");
    expect(Number(queuedJob?.opts?.delay)).toBeGreaterThan(0);
  });

  it("should pause a job, setIsActive to false and removed from the  queue (unscheduled)", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);
    const jobId = Number(response.body.data.id);
    const bullJobId = `cron-${jobId}`;

    //Initial find job in queue when active is true
    let queuedJob;
    queuedJob = await findJobInQueue(bullJobId);
    expect(queuedJob).toBeDefined();
    expect(queuedJob?.data?.jobId).toEqual(bullJobId);
    expect(queuedJob?.data?.userId).toBeDefined();

    //Final cant find job in queue when active is false
    await agent.patch(`/api/jobs/${jobId}`);
    const [job] = await db.select().from(Job).where(eq(Job.id, jobId));
    expect(job?.isActive).toBe(false);

    queuedJob = await findJobInQueue(bullJobId);
    expect(queuedJob).toBeUndefined();
    expect(queuedJob?.data?.jobId).toBeUndefined;
    expect(queuedJob?.data?.userId).toBeUndefined();
  });
  it("should resume a job, setIsActive to true and added back to the  queue (scheduled)", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);
    const jobId = Number(response.body.data.id);
    const bullJobId = `cron-${jobId}`;

    let queuedJob;

    //Initial cant find job in queue when active is false
    await agent.patch(`/api/jobs/${jobId}`);
    const [job] = await db.select().from(Job).where(eq(Job.id, jobId));
    expect(job?.isActive).toBe(false);

    queuedJob = await findJobInQueue(bullJobId);
    expect(queuedJob).toBeUndefined();
    expect(queuedJob?.data?.jobId).toBeUndefined;
    expect(queuedJob?.data?.userId).toBeUndefined();

    //Final finds job in queue when active is true
    await agent.patch(`/api/jobs/${jobId}`);
    const [updated] = await db.select().from(Job).where(eq(Job.id, jobId));
    expect(updated?.isActive).toBe(true);
    queuedJob = await findJobInQueue(bullJobId);
    expect(queuedJob).toBeDefined();
    expect(queuedJob?.data?.jobId).toEqual(bullJobId);
    expect(queuedJob?.data?.userId).toBeDefined();
  });
  it("should delete a job — 200, row gone, BullMQ job removed (unscheduled)", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);
    expect(response.status).toEqual(201);
    const jobId = Number(response.body.data.id);
    const bullJobId = `cron-${jobId}`;

    //Job is scheduled on creation
    const queuedJob = await findJobInQueue(bullJobId);
    expect(queuedJob).toBeDefined();

    const deleted = await agent.delete(`/api/jobs/${jobId}`);
    expect(deleted.status).toEqual(200);
    expect(deleted.body.status).toEqual("success");

    //Row gone
    const [row] = await db.select().from(Job).where(eq(Job.id, jobId));
    expect(row).toBeUndefined();

    //BullMQ job removed — unscheduleJob is fire-and-forget, so poll instead of racing Redis
    const gone = await findJobInQueue(bullJobId);
    expect(gone).toBeUndefined();
  });
  it("should cascade-delete a job's executions and notifications with it", async () => {
    const response = await agent.post("/api/jobs").send(JOB_PAYLOAD);
    expect(response.status).toEqual(201);
    const jobId = Number(response.body.data.id);

    //Executions only exist once the worker has run, so both children are seeded
    //directly — the delete itself must be the thing that wipes them
    await db.insert(Execution).values({
      status: "success",
      startedAt: new Date(),
      completedAt: new Date(),
      statusCode: 200,
      duration: 120,
      jobId,
    });
    await db.insert(Notification).values({
      type: "email",
      event: "failure",
      target: "alert@gmail.com",
      jobId,
    });

    //Seed sanity — both children exist before the delete
    const seededExecutions = await db
      .select()
      .from(Execution)
      .where(eq(Execution.jobId, jobId));
    const seededNotifications = await db
      .select()
      .from(Notification)
      .where(eq(Notification.jobId, jobId));
    expect(seededExecutions).toHaveLength(1);
    expect(seededNotifications).toHaveLength(1);

    const deleted = await agent.delete(`/api/jobs/${jobId}`);
    expect(deleted.status).toEqual(200);

    //Postgres FK onDelete:"cascade" wiped both child tables
    const executions = await db
      .select()
      .from(Execution)
      .where(eq(Execution.jobId, jobId));
    expect(executions).toHaveLength(0);

    const notifications = await db
      .select()
      .from(Notification)
      .where(eq(Notification.jobId, jobId));
    expect(notifications).toHaveLength(0);
  });
});

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
import { Job, User } from "../database/db.schema.js";
import { eq } from "drizzle-orm";

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

    //queue.add is fire-and-forget in scheduleJob, so give the write a
    //moment to land in Redis instead of racing it
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
});

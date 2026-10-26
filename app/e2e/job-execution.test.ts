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
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
  db,
  redis,
} from "../shared/helpers/test-setup.js";
import { Job, Execution } from "../database/db.schema.js";
import type { Execution as ExecutionType } from "../shared/types/entities.js";

type Agent = ReturnType<typeof request.agent>;

//Job execution lifecycle — run-now accepts the trigger (202), the worker
//records a running execution, completes it and updates lastRunAt, and the
//history endpoint returns it. HTTP is deterministic via the global fetchMock
//(jest.setup.ts); queue, worker, execution service and DB run for real
declare const fetchMock: {
  mockResponse: (body: unknown, init?: unknown) => unknown;
};

const WAIT_TTL = 10000;

const CREATE_PAYLOAD = {
  name: "ping-target",
  cronExpression: "0 0 1 1 *",
  httpMethod: "GET",
  description: "job execution e2e",
  httpBody: {},
  httpHeader: {},
  httpCommand: "https://mock-target.test/fired",
};

describe("Job Execution Lifecycle", () => {
  let agent: Agent;
  let queueEvents: QueueEvents;

  beforeAll(async () => {
    await SetupTestInfra();
    queueEvents = new QueueEvents("schedular", { connection: redis });
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
        `1`,
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

  it(
    "should run a job now — 202 and an execution row in RUNNING",
    async () => {
      const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
      expect(created.status).toEqual(201);
      const jobId = Number(created.body.data.id);

      //The fetch is mocked and held to maintain in running state in the quueue
      let releaseNow: () => void = () => undefined;
      fetchMock.mockResponse(
        () =>
          new Promise<Response>((resolve) => {
            releaseNow = () =>
              resolve(
                new Response(JSON.stringify({ ok: true }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              );
          }),
      );

      await agent.post(`/api/jobs/${jobId}`).expect((res) => {
        //202 Accepted — trigger accepted, execution created asynchronously
        expect(res.status).toEqual(202);
        expect(res.body).toMatchObject({ status: "success", data: true });
      });

      //Row is initially created as  running; the held fetch keeps it in that state
      let row: ExecutionType | undefined;
      for (let attempt = 0; attempt < 20; attempt++) {
        [row] = await db
          .select()
          .from(Execution)
          .where(eq(Execution.jobId, jobId))
          .orderBy(desc(Execution.id))
          .limit(1);
        if (row) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(row?.status).toEqual("running");
      expect(row?.statusCode).toBeNull();

      const trigger = await findRunNowTrigger(jobId);
      releaseNow();
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should complete the execution — SUCCESS, statusCode 200, lastRunAt updated",
    async () => {
      const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
      expect(created.status).toEqual(201);
      const jobId = Number(created.body.data.id);

      fetchMock.mockResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      //waitUntilFinished resolves only after the processor returns — the
      //lastRunAt write is inside it, so the reads below need no polling
      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      const [row] = await db
        .select()
        .from(Execution)
        .where(eq(Execution.jobId, jobId))
        .orderBy(desc(Execution.id))
        .limit(1);
      expect(row?.status).toEqual("success");
      expect(row?.statusCode).toEqual(200);
      expect(row?.completedAt).not.toBeNull();
      expect(row?.duration).not.toBeNull();

      const [job] = await db.select().from(Job).where(eq(Job.id, jobId));
      expect(job?.lastRunAt).not.toBeNull();
    },
    WAIT_TTL + 5000,
  );

  it(
    "should list the execution in the job's history — 200 with the execution in the array",
    async () => {
      const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
      expect(created.status).toEqual(201);
      const jobId = Number(created.body.data.id);

      fetchMock.mockResponse(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      await agent
        .post(`/api/jobs/${jobId}`)
        .expect(202)
        .expect({ status: "success", data: true });

      const trigger = await findRunNowTrigger(jobId);
      await expect(
        trigger.waitUntilFinished(queueEvents, WAIT_TTL),
      ).resolves.toBeDefined();

      const response = await agent
        .get("/api/executions")
        .query({ jobId, limit: 10 });
      expect(response.status).toEqual(200);
      expect(response.body.status).toEqual("success");
      expect(Array.isArray(response.body.data)).toBe(true);
      const listed = response.body.data[0];
      expect(listed.jobId).toEqual(jobId);
      expect(listed.status).toEqual("success");
      expect(listed.statusCode).toEqual(200);
    },
    WAIT_TTL + 5000,
  );
});

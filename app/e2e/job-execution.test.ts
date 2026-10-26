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
import { closeInfra } from "../infra.js";
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
  db,
} from "../shared/helpers/test-setup.js";
import { Job, Execution } from "../database/db.schema.js";
import { eq, desc } from "drizzle-orm";

type Agent = ReturnType<typeof request.agent>;

//Job execution lifecycle — run-now accepts the trigger, the worker records a
//running execution, completes it and updates lastRunAt, and the history
//endpoint returns it
//
//The worker runs for real and HTTP execution is deterministic: global fetch
//is mocked here, everything else — queue, worker, execution service, DB —
//is the real path

const MOCK_TARGET = "https://mock-target.test/fired";

function makeOkResponse() {
  return new Response(JSON.stringify({ ok: true, at: Date.now() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

//Global fetch double from jest.setup.ts (jest-fetch-mock). Minimal ambient
//typing for the subset we drive from inside a test
declare const fetchMock: {
  mockImplementation: (impl: () => Promise<Response>) => unknown;
};

//Fetch double modes
// - ok:    resolves immediately with a 200 JSON response
// - held:  stays pending until release() — holds the execution in `running`
//          so the running state is observable
let FETCH_MODE: "ok" | "held" = "ok";
let releaseFetch: (() => void) | undefined = undefined;

function implementFetch() {
  fetchMock.mockImplementation(() => {
    if (FETCH_MODE === "held") {
      return new Promise<Response>((resolve) => {
        releaseFetch = () => resolve(makeOkResponse());
      });
    }
    return Promise.resolve(makeOkResponse());
  });
}

const CREATE_PAYLOAD = {
  name: "ping-target",
  cronExpression: "0 0 1 1 *",
  httpMethod: "GET",
  description: "job execution e2e",
  httpBody: {},
  httpHeader: {},
  httpCommand: MOCK_TARGET,
};

async function pollFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  attempts = 40,
  waitMs = 50,
): Promise<T> {
  //The worker runs asynchronously, so every read is polled instead of raced
  let value = await read();
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (done(value)) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    value = await read();
  }
  return value;
}

async function startRun(agent: Agent, jobId: number) {
  const response = await agent.post(`/api/jobs/${jobId}`);
  //202 Accepted — trigger accepted, execution created asynchronously by the worker
  expect(response.status).toEqual(202);
  expect(response.body.status).toEqual("success");
  expect(response.body.data).toEqual(true);
}

describe("Job Execution Lifecycle", () => {
  let agent: Agent;

  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    FETCH_MODE = "ok";
    releaseFetch = undefined;
    implementFetch();
    agent = request.agent(app);
    //User is created and session is persisted for each test
    await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: "caller@gmail.com",
      password: "abcd1234$",
    });
  });

  afterAll(async () => {
    await TeardownTestInfra();
    await closeInfra();
  });

  it("should run a job now — 202 and an execution row in RUNNING", async () => {
    const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
    expect(created.status).toEqual(201);
    const jobId = Number(created.body.data.id);

    //Hold the worker's fetch so the running window is observable
    FETCH_MODE = "held";

    await startRun(agent, jobId);

    //Worker picked the queue entry up and created the execution row,
    //blocked on the held fetch — status must be running
    const execution = await pollFor(
      () =>
        db
          .select()
          .from(Execution)
          .where(eq(Execution.jobId, jobId))
          .orderBy(desc(Execution.id))
          .limit(1),
      (rows) => rows.length > 0,
    );

    expect(execution).toHaveLength(1);
    expect(execution[0]?.status).toEqual("running");
    expect(execution[0]?.statusCode).toBeNull();

    //Release the worker's fetch so the execution can complete again
    releaseFetch?.();

    //Drain: the queue must be empty of in-flight work before the next test
    await pollFor(
      () =>
        db
          .select()
          .from(Execution)
          .where(eq(Execution.jobId, jobId))
          .orderBy(desc(Execution.id))
          .limit(1),
      (rows) => rows.length > 0 && rows[0]?.status === "success",
    );
  });

  it("should complete the execution — SUCCESS, statusCode 200, lastRunAt updated", async () => {
    const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
    expect(created.status).toEqual(201);
    const jobId = Number(created.body.data.id);

    await startRun(agent, jobId);

    //Worker completes the execution against the immediate fetch double
    const execution = await pollFor(
      () =>
        db
          .select()
          .from(Execution)
          .where(eq(Execution.jobId, jobId))
          .orderBy(desc(Execution.id))
          .limit(1),
      (rows) => rows.length > 0 && rows[0]?.status === "success",
    );

    expect(execution).toHaveLength(1);
    expect(execution[0]?.status).toEqual("success");
    expect(execution[0]?.statusCode).toEqual(200);
    expect(execution[0]?.completedAt).not.toBeNull();
    expect(execution[0]?.duration).not.toBeNull();

    //lastRunAt is updated on the job after completion
    const job = await pollFor(
      () => db.select().from(Job).where(eq(Job.id, jobId)),
      (rows) => rows.length > 0 && rows[0]?.lastRunAt !== null,
    );

    expect(job).toHaveLength(1);
    expect(job[0]?.lastRunAt).not.toBeNull();
  });

  it("should list the execution in the job's history — 200 with the execution in the array", async () => {
    const created = await agent.post("/api/jobs").send(CREATE_PAYLOAD);
    expect(created.status).toEqual(201);
    const jobId = Number(created.body.data.id);

    await startRun(agent, jobId);

    //History reflects only what the worker has recorded — poll until the
    //completed execution is listed
    const history = await pollFor(async () => {
      const response = await agent
        .get("/api/executions")
        .query({ jobId, limit: 10 });
      return { status: response.status, body: response.body };
    }, (result) => result.status === 200 && result.body.data.length > 0);

    expect(history.status).toEqual(200);
    expect(history.body.status).toEqual("success");
    expect(Array.isArray(history.body.data)).toBe(true);
    const listed = history.body.data[0];
    expect(listed.jobId).toEqual(jobId);
    expect(listed.status).toEqual("success");
    expect(listed.statusCode).toEqual(200);
  });
});

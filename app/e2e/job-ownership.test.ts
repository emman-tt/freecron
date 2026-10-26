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
} from "../shared/helpers/test-setup.js";

type Agent = ReturnType<typeof request.agent>;

const OWNER_EMAIL = "owner@gmail.com";
const OTHER_EMAIL = "other@gmail.com";

async function signup(agent: Agent, email: string) {
  await agent.post("/api/auth/sign-up/email").send({
    name: "emmanuel",
    email,
    password: "abcd1234$",
  });
}

const jobPayload = (name: string) => ({
  name,
  cronExpression: "*/5 * * * *",
  httpMethod: "GET",
  description: "job ownership e2e",
  httpBody: {},
  httpHeader: {},
  httpCommand: "https://google.com",
});

async function createJob(agent: Agent, name: string) {
  const response = await agent.post("/api/jobs").send(jobPayload(name));
  expect(response.status).toEqual(201);
  return response.body.data as { id: number };
}

describe("Job Ownership ", () => {
  let ownerAgent: Agent;
  let otherAgent: Agent;
  let ownerJob: { id: number };

  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    ownerAgent = request.agent(app);
    otherAgent = request.agent(app);
    await signup(ownerAgent, OWNER_EMAIL);
    await signup(otherAgent, OTHER_EMAIL);
    ownerJob = await createJob(ownerAgent, "owner-job");
  });

  afterAll(async () => {
    await TeardownTestInfra();
    await closeInfra();
  });

  it("should not read another user's job — 403", async () => {
    const response = await otherAgent.get(`/api/jobs/${ownerJob.id}`);

    expect(response.status).toEqual(403);
    expect(response.body.data).toBeUndefined();
  });

  it("should not update another user's job — 403", async () => {
    const response = await otherAgent
      .put(`/api/jobs/${ownerJob.id}`)
      .send({ name: "stolen-job" });

    expect(response.status).toEqual(403);
    expect(response.body.data).toBeUndefined();

    //The job is untouched
    const unchanged = await ownerAgent.get(`/api/jobs/${ownerJob.id}`);
    expect(unchanged.status).toEqual(200);
    expect(unchanged.body.data.name).toEqual("owner-job");
  });

  it("should not delete another user's job — 403", async () => {
    const response = await otherAgent.delete(`/api/jobs/${ownerJob.id}`);

    expect(response.status).toEqual(403);
    expect(response.body.data).toBeUndefined();

    //Still readable and intact by the real owner
    const intact = await ownerAgent.get(`/api/jobs/${ownerJob.id}`);
    expect(intact.status).toEqual(200);
  });

  it("should list only own jobs", async () => {
    await createJob(ownerAgent, "owner-job-2");
    const otherJob = await createJob(otherAgent, "other-job");

    const ownerList = await ownerAgent.get("/api/jobs");
    expect(ownerList.status).toEqual(200);
    expect(ownerList.body.data).toHaveLength(2);
    for (const job of ownerList.body.data) {
      expect(job.name).toMatch(/owner-job/);
      expect(job.name).not.toMatch(/other-job/);
    }

    const otherList = await otherAgent.get("/api/jobs");
    expect(otherList.status).toEqual(200);
    expect(otherList.body.data).toHaveLength(1);
    expect(otherList.body.data[0].id).toEqual(otherJob.id);
    expect(otherList.body.data[0].name).toEqual("other-job");
  });

  it("should not add a notification to another user's job — 403", async () => {
    const response = await otherAgent.post("/api/notifications").send({
      jobId: ownerJob.id,
      type: "email",
      event: "failure",
      target: "attacker@gmail.com",
    });

    expect(response.status).toEqual(403);
    expect(response.body.data).toBeUndefined();

    //No rule may exist for the owner's job
    const ownerNotifications = await ownerAgent.get(
      `/api/notifications?jobId=${ownerJob.id}`,
    );
    expect(ownerNotifications.status).toEqual(200);
    expect(ownerNotifications.body.data).toHaveLength(0);
  });
});

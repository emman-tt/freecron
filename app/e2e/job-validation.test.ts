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

//Job create validation — the bouncer at the door. Every invalid input is
//rejected 400 by zod rules before any persistence happens

//A payload valid by every rule; each test bends exactly one field
const VALID = {
  name: "health-check",
  cronExpression: "0 0 1 1 *",
  httpMethod: "GET",
  description: "job validation e2e",
  httpCommand: "https://mock-target.test/fired",
};

describe("Job Create Validation", () => {
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
      email: "caller@gmail.com",
      password: "abcd1234$",
    });
  });

  afterAll(async () => {
    await TeardownTestInfra();
    await closeInfra();
  });

  it("should reject a GET job with a body not empty — 400 naming the rule", async () => {
    const response = await agent
      .post("/api/jobs")
      .send({ ...VALID, httpBody: { key: "value" } });

    expect(response.status).toEqual(400);
    expect(response.body.status).toEqual("fail");
    expect(response.body.error).toEqual("Validation Error");
    expect(response.body.message).toContain("cannot have body");
  });

  it("should reject a HEAD job with body — 400 (HEAD is not an allowed method)", async () => {
    const response = await agent
      .post("/api/jobs")
      .send({ ...VALID, httpMethod: "HEAD", httpBody: { key: "value" } });

    expect(response.status).toEqual(400);
    expect(response.body.status).toEqual("fail");
    expect(response.body.error).toEqual("Validation Error");
  });

  it("should accept a GET job with an explicitly empty body — 201", async () => {
    const response = await agent
      .post("/api/jobs")
      .send({ ...VALID, httpBody: {} });

    expect(response.status).toEqual(201);
    expect(response.body.status).toEqual("success");
    expect(response.body.data.id).toBeDefined();
  });

  it("should accept a GET job with httpBody omitted — 201, defaulting to empty body", async () => {
    const response = await agent.post("/api/jobs").send({ ...VALID });

    expect(response.status).toEqual(201);
    expect(response.body.status).toEqual("success");
    expect(response.body.data.id).toBeDefined();
  });

  it("should reject an invalid cron expression — 400", async () => {
    const response = await agent
      .post("/api/jobs")
      .send({ ...VALID, cronExpression: "not-a-cron" });

    expect(response.status).toEqual(400);
    expect(response.body.status).toEqual("fail");
    expect(response.body.error).toEqual("Validation Error");
  });

  it("should reject a job missing a required field — 400", async () => {
    //name is a required field with no default — sending without it
    const withoutName: Omit<typeof VALID, "name"> = {
      cronExpression: VALID.cronExpression,
      httpMethod: VALID.httpMethod,
      description: VALID.description,
      httpCommand: VALID.httpCommand,
    };
    const response = await agent.post("/api/jobs").send(withoutName);

    expect(response.status).toEqual(400);
    expect(response.body.status).toEqual("fail");
    expect(response.body.error).toEqual("Validation Error");
  });

  it("should reject an invalid http method — 400 (lowercase is still invalid)", async () => {
    const response = await agent
      .post("/api/jobs")
      .send({ ...VALID, httpMethod: "get" });

    expect(response.status).toEqual(400);
    expect(response.body.status).toEqual("fail");
    expect(response.body.error).toEqual("Validation Error");
  });
});

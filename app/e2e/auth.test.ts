import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import request from "supertest";
import type { Request } from "supertest";
import { app } from "../index.js";
import { closeInfra } from "../infra.js";
import { workerLogger } from "../shared/lib/logger.service.js";
import {
  CleanTestInfra,
  db,
  SetupTestInfra,
  TeardownTestInfra,
} from "../shared/helpers/test-setup.js";
import { User } from "../database/db.schema.js";
import { eq } from "drizzle-orm";
import { auth } from "../shared/lib/auth.service.js";

describe("Auth ", () => {
  let agent: ReturnType<typeof request.agent>;
  beforeAll(async () => {
    await SetupTestInfra();
  });

  beforeEach(async () => {
    await CleanTestInfra();
    agent = request.agent(app);
  });

  afterAll(async () => {
    await TeardownTestInfra();
    await closeInfra();
  });
  it("creates a new user account", async () => {
    const response = await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: "emma@gmail.com",
      password: "abcd1234$",
    });
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.email, "emma@gmail.com"));

    expect(response.status).toEqual(200);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "freecron.session_token",
    );
    expect(user).toBeDefined();
    expect(user?.email).toMatch("emma@gmail.com");
  });

  it("should login an already created account", async () => {
    await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: "emma@gmail.com",
      password: "abcd1234$",
    });
    const response = await agent.post("/api/auth/sign-in/email").send({
      email: "emma@gmail.com",
      password: "abcd1234$",
    });
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.email, "emma@gmail.com"));

    expect(response.status).toEqual(200);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "freecron.session_token",
    );
    expect(user).toBeDefined();
    expect(user?.email).toMatch("emma@gmail.com");
  });

  it("should  fail login , user dont exist", async () => {
    const response = await agent.post("/api/auth/sign-in/email").send({
      email: "emma@gmail.com",
      password: "abcd1234$",
    });
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.email, "emma@gmail.com"));

    expect(response.status).toEqual(401);
    expect(response.headers["set-cookie"]?.[0]).toBeUndefined();
    expect(user).toBeUndefined();
  });
  it("should  fail login , wrong user credentials", async () => {
    const response = await agent.post("/api/auth/sign-in/email").send({
      email: "emma@gmail.com",
      password: "abcd1234",
    });
    const [user] = await db
      .select()
      .from(User)
      .where(eq(User.email, "emma@gmail.com"));

    expect(response.status).toEqual(401);
    expect(response.headers["set-cookie"]?.[0]).toBeUndefined();
    expect(user).toBeUndefined();
  });
  it("should  fail login , user logged out", async () => {
    await agent.post("/api/auth/sign-up/email").send({
      name: "emmanuel",
      email: "emma@gmail.com",
      password: "abcd1234$",
    });
    await agent.post("/api/auth/sign-in/email").send({
      email: "emma@gmail.com",
      password: "abcd1234$",
    });

    //authenticatedResponse is for when user is still logged in whiles unAuthenticated is not
    const authenticatedResponse = await agent.get("/api/users/me");

    expect(authenticatedResponse.status).toEqual(200);
    expect(authenticatedResponse.body.data.name).toEqual("emmanuel");

  
    await agent.post("/api/auth/sign-out");

    const unAuthenticatedResponse = await agent.get("/api/users/me");
    expect(unAuthenticatedResponse.status).toEqual(401);
    expect(unAuthenticatedResponse.body.data?.name).toBeUndefined();
  });
});

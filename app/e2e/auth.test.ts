import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import type { Request } from "supertest";
import { app } from "../index.js";
import { closeInfra } from "../infra.js";
import { workerLogger } from "../shared/lib/logger.service.js";
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
} from "../shared/helpers/test-setup.js";

describe("Auth ", () => {
  let agent: ReturnType<typeof request.agent>;
  beforeEach(async () => {
    await SetupTestInfra();
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await CleanTestInfra();
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
    workerLogger.debug(
      {
        setCookie: response.headers["set-cookie"],
        filename: "auth.test.ts",
        functionname: "(anonymous)",
      },
      "signup set-cookie headers",
    );
    expect(response.status).toEqual(200);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "freecron.session_token",
    );
  });
});

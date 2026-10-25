import { describe, it } from "@jest/globals";
import request from "supertest";
import type { Request } from "supertest";
import { app } from "../index.js";

describe("Auth ", () => {
  it("creates a new user account", async () => {
   const response = await request(app).POST("/api/auth/sign-up/email");
  });
});

import {
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  expect,
  it,
} from "@jest/globals";
import {
  SetupTestInfra,
  CleanTestInfra,
  TeardownTestInfra,
  createUserTest,
  db,
} from "../../../shared/helpers/test-setup.js";
import { UserRepository } from "../user.repository.js";
import { JobRespository } from "../../Jobs/job.repository.js";
import { NotificationRepository } from "../../Notification/notification.repository.js";
import { ExecutionRespository } from "../../Execution/execution.repository.js";
import { Account, Job, Session } from "../../../database/db.schema.js";
import { eq } from "drizzle-orm";
import type { createJobDTO } from "../../Jobs/job.types.js";

describe("User repository integration test", () => {
  let userRepo: UserRepository;
  let jobRepo: JobRespository;
  let notificationRepo: NotificationRepository;
  let executionRepo: ExecutionRespository;

  beforeAll(async () => {
    await SetupTestInfra();
    userRepo = new UserRepository();
    jobRepo = new JobRespository();
    notificationRepo = new NotificationRepository();
    executionRepo = new ExecutionRespository();
  });

  beforeEach(async () => {
    await CleanTestInfra();
  });

  afterAll(async () => {
    await TeardownTestInfra();
  });

  const createJobEntity: createJobDTO = {
    name: "astroverse",
    cronExpression: "*/5 * * * *",
    httpCommand: "https://google.com",
    httpMethod: "DELETE",
    description: "A daily google ping",
    httpBody: {},
    httpHeader: {},
  };

  it("should find a user by id", async () => {
    const user = await createUserTest("emma");

    //Act
    const result = await userRepo.findById(user.id);

    //Assert
    expect(result?.id).toBe(user.id);
    expect(result?.email).toBe(user.email);
  });

  it("should return undefined for a missing user", async () => {
    //Act
    const result = await userRepo.findById(
      "123e4567-e89b-12d3-a456-426614174000",
    );

    //Assert
    expect(result).toBeUndefined();
  });

  it("should update a user record", async () => {
    const user = await createUserTest("kwame");

    //Act
    const [updated] = await userRepo.update(user.id, { name: "renamed" });

    //Assert
    expect(updated?.id).toBe(user.id);
    expect(updated?.name).toBe("renamed");
    expect(updated?.email).toBe(user.email);
  });

  it("should cascade delete everything owned by the user", async () => {
    const user = await createUserTest("ama");
    const job = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );
    await notificationRepo.create(
      {
        type: "email",
        event: "failure",
        target: "owner@example.com",
        channelId: null,
      },
      job?.id as number,
    );
    await executionRepo.create({
      jobId: job?.id as number,
      status: "running",
      error: null,
      response: null,
      completedAt: null,
      duration: null,
      statusCode: null,
      startedAt: new Date(),
    });
    await db.insert(Session).values({
      token: "token-123",
      expiresAt: new Date("2026-09-23T06:30:00.000Z"),
      userId: user.id,
    });
    await db.insert(Account).values({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: "hashed",
    });

    //Act — FK onDelete:cascade fans out to jobs, executions,
    // notifications, sessions and accounts
    await userRepo.delete(user.id);

    //Assert — user, job, execution, notification gone
    expect(await userRepo.findById(user.id)).toBeUndefined();
    const [jobRow] = await db.select().from(Job).where(eq(Job.id, job?.id as number));
    expect(jobRow).toBeUndefined();

    //Assert — sessions and accounts followed their FK cascade
    const sessions = await db
      .select()
      .from(Session)
      .where(eq(Session.userId, user.id));
    const accounts = await db
      .select()
      .from(Account)
      .where(eq(Account.userId, user.id));
    expect(sessions).toHaveLength(0);
    expect(accounts).toHaveLength(0);
  });
});

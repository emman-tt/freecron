import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import {
  CleanTestInfra,
  createJobTest,
  createUserTest,
  db,
  SetupTestInfra,
  TeardownTestInfra,
} from "../../../shared/helpers/test-setup.js";
import { ExecutionRespository } from "../execution.repository.js";
import type {
  Execution as ExecutionType,
  Job,
} from "../../../shared/types/entities.js";
import type { updateDTO } from "../execution.types.js";
import { JOB_DEFUALTS } from "../../Jobs/job.defaults.js";
import { Execution } from "../../../database/db.schema.js";
import { eq } from "drizzle-orm";
describe("Execution repository", () => {
  let executionRepo: ExecutionRespository;
  beforeAll(async () => {
    await SetupTestInfra();
    executionRepo = new ExecutionRespository();
  });

  beforeEach(async () => {
    await CleanTestInfra();
  });

  afterAll(async () => {
    await TeardownTestInfra();
  });

  it("should create a new execution record", async () => {
    //Arrange
    const user = await createUserTest("Emma");
    const jobEntity: Job = {
      name: "astroverse",
      cronExpression: "*/5 * * * *",
      lastRunAt: null,
      nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
      httpCommand: "https://google.com",
      httpMethod: "PATCH",
      userId: user.id,
      timeout: JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
      description: JOB_DEFUALTS.description,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      httpBody: JOB_DEFUALTS.httpBody,
      httpHeader: JOB_DEFUALTS.httpHeader,
    };
    const job = await createJobTest(user.id, jobEntity);
    const executionEntity: ExecutionType = {
      jobId: job!.id,
      status: "running",
      startedAt: new Date("2026-09-29T09:00:00.000Z"),
      completedAt: new Date("2026-09-29T09:00:05.000Z"),
      duration: 5000,
      statusCode: 200,
      error: null,
      response: { ok: true },
    };

    //Act
    const result = await executionRepo.create(executionEntity);

    //Assert
    const [created] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.id, result!.id));
    expect(result).toBeDefined();
    expect(result?.jobId).toEqual(result?.jobId);
    expect(created).toHaveProperty("jobId");
    expect(created?.createdAt).toBeInstanceOf(Date);
    expect(created?.updatedAt).toBeInstanceOf(Date);
    expect(created?.startedAt).toEqual(result?.startedAt);
    expect(created?.completedAt).toEqual(executionEntity.completedAt);
  });

  it("should find execution record by  id / primary key ", async () => {
    //Arrange
    const user = await createUserTest("Acquah");
    const jobEntity: Job = {
      name: "astroverse",
      cronExpression: "*/5 * * * *",
      lastRunAt: null,
      nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
      httpCommand: "https://google.com",
      httpMethod: "PATCH",
      userId: user.id,
      timeout: JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
      description: JOB_DEFUALTS.description,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      httpBody: JOB_DEFUALTS.httpBody,
      httpHeader: JOB_DEFUALTS.httpHeader,
    };
    const job = await createJobTest(user.id, jobEntity);
    const executionEntity: ExecutionType = {
      jobId: job!.id,
      status: "running",
      startedAt: new Date("2026-09-29T09:00:00.000Z"),
      completedAt: new Date("2026-09-29T09:00:05.000Z"),
      duration: 5000,
      statusCode: 200,
      error: null,
      response: { ok: true },
    };
    const created = await executionRepo.create(executionEntity);

    //Act
    const result = await executionRepo.findById(created!.id);

    //Assert
    expect(result).toBeDefined();
    expect(result).toMatchObject(created!);
    expect(result?.jobId).toEqual(job!.id);
    expect(result?.startedAt).toEqual(created!.startedAt);
    expect(result?.completedAt).toEqual(created!.completedAt);
    expect(result?.response).toMatchObject(created?.response!);
    expect(result?.status).toBe(created!.status);
    expect(result?.updatedAt).toEqual(created!.updatedAt);
    expect(result?.createdAt).toEqual(created!.createdAt);
  });

  it("should find all execution records by job id", async () => {
    //Arrange
    const user = await createUserTest("Acquah");
    const jobEntity: Job = {
      name: "astroverse",
      cronExpression: "*/5 * * * *",
      lastRunAt: null,
      nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
      httpCommand: "https://google.com",
      httpMethod: "PATCH",
      userId: user.id,
      timeout: JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
      description: JOB_DEFUALTS.description,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      httpBody: JOB_DEFUALTS.httpBody,
      httpHeader: JOB_DEFUALTS.httpHeader,
    };
    const jobOne = await createJobTest(user.id, {
      ...jobEntity,
      name: "job-one",
    });
    const jobTwo = await createJobTest(user.id, {
      ...jobEntity,
      name: "job-two",
    });

    const executionEntity: ExecutionType = {
      jobId: jobOne!.id,
      status: "running",
      startedAt: new Date("2026-09-29T09:00:00.000Z"),
      completedAt: new Date("2026-09-29T09:00:05.000Z"),
      duration: 5000,
      statusCode: 200,
      error: null,
      response: { ok: true },
    };
    await executionRepo.create({ ...executionEntity, jobId: jobOne!.id });
    await executionRepo.create({ ...executionEntity, jobId: jobTwo!.id });
    await executionRepo.create({ ...executionEntity, jobId: jobTwo!.id });
    await executionRepo.create({ ...executionEntity, jobId: jobTwo!.id });

    //Act
    const resultOne = await executionRepo.findAllByJobId(jobOne!.id, 20, 0);
    const resultTwo = await executionRepo.findAllByJobId(jobTwo!.id, 20, 0);

    //Assert
    expect(resultTwo).toHaveLength(3);
    expect(resultOne).toHaveLength(1);
    expect(resultTwo.every((item) => item.jobId === jobTwo?.id)).toBe(true);
    expect(resultOne.every((item) => item.jobId === jobOne?.id)).toEqual(true);
  });

  it("should update an execution record", async () => {
    //Arrange
    const user = await createUserTest("Emma");
    const jobEntity: Job = {
      name: "astroverse",
      cronExpression: "*/5 * * * *",
      lastRunAt: null,
      nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
      httpCommand: "https://google.com",
      httpMethod: "PATCH",
      userId: user.id,
      timeout: JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
      description: JOB_DEFUALTS.description,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      httpBody: JOB_DEFUALTS.httpBody,
      httpHeader: JOB_DEFUALTS.httpHeader,
    };
    const job = await createJobTest(user.id, jobEntity);
    const created = await executionRepo.create({
      jobId: job!.id,
      status: "running",
      startedAt: new Date("2026-09-29T09:00:00.000Z"),
      completedAt: null,
      duration: null,
      statusCode: null,
      error: null,
      response: null,
    });
    const updateData: updateDTO = {
      status: "failed",
      error: "Request timed out",
      completedAt: new Date("2026-09-29T09:00:05.000Z"),
      duration: 5000,
      statusCode: 504,
      response: { ok: false, reason: "timeout" },
    };

    //Act
    const updated = await executionRepo.update(updateData, created!.id);
    const [persisted] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.id, created!.id));

    //Assert
    expect(updated).toMatchObject({
      id: created!.id,
      jobId: job!.id,
      ...updateData,
    });
    expect(persisted).toMatchObject({
      id: created!.id,
      jobId: job!.id,
      ...updateData,
    });
    expect(persisted?.startedAt).toEqual(created?.startedAt);
    expect(persisted?.createdAt).toEqual(created?.createdAt);
    //updatedAt is written from the JS clock ($onUpdate) while createdAt comes
    //from the DB clock (now()) — Docker VM clock drift can order the two
    //clocks either way, so assert "not reset" within a skew tolerance rather
    //than a cross-clock >=
    expect(persisted?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      (created?.updatedAt.getTime() as number) - 2000,
    );
  });

  it("should sweep stale running rows and leave fresh ones untouched", async () => {
    //Arrange: one orphan (started 20 min ago — beyond any legit lifetime,
    //D-9's attempts × timeout + backoffs cap out near 3 min) and one run
    //that is genuinely in flight
    const user = await createUserTest("Emma");
    const jobEntity: Job = {
      name: "astroverse",
      cronExpression: "*/5 * * * *",
      lastRunAt: null,
      nextRunAt: new Date("2026-09-22T07:00:00.001Z"),
      httpCommand: "https://google.com",
      httpMethod: "PATCH",
      userId: user.id,
      timeout: JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
      description: JOB_DEFUALTS.description,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      httpBody: JOB_DEFUALTS.httpBody,
      httpHeader: JOB_DEFUALTS.httpHeader,
    };
    const job = await createJobTest(user.id, jobEntity);
    const stale = await executionRepo.create({
      jobId: job!.id,
      status: "running",
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      completedAt: null,
      duration: null,
      statusCode: null,
      error: null,
      response: null,
    });
    const fresh = await executionRepo.create({
      jobId: job!.id,
      status: "running",
      startedAt: new Date(),
      completedAt: null,
      duration: null,
      statusCode: null,
      error: null,
      response: null,
    });

    //Act
    const swept = await executionRepo.markStaleRunning(
      new Date(Date.now() - 15 * 60 * 1000),
      "stale running — worker died before terminal write",
    );

    //Assert: only the orphan is closed, with the sweep's own words and the
    //statusCode-0 sentinel (D-12) — duration stays null, unknowable
    expect(swept.map((row) => row.id)).toEqual([stale!.id]);
    const [staleRow] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.id, stale!.id));
    expect(staleRow).toMatchObject({
      status: "failed",
      statusCode: 0,
      error: "stale running — worker died before terminal write",
      duration: null,
    });
    expect(staleRow?.completedAt).toBeInstanceOf(Date);

    const [freshRow] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.id, fresh!.id));
    expect(freshRow?.status).toBe("running");
    expect(freshRow?.error).toBeNull();
  });
});

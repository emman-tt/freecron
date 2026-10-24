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
} from "../../../shared/helpers/test-setup.js";
import { db } from "../../../shared/helpers/test-setup.js";
import { JobRespository } from "../job.repository.js";
import type { createJobDTO, updateJobDTO } from "../job.types.js";
import { Job, User } from "../../../database/db.schema.js";
import { count, eq, sql } from "drizzle-orm";
import { NotFoundError } from "../../../shared/errors/business.errors.js";
import { createUserTest } from "../../../shared/helpers/test-setup.js";
describe("Job repository integration test", () => {
  let jobRepo: JobRespository;
  beforeAll(async () => {
    await SetupTestInfra();
    jobRepo = new JobRespository();
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

  it("should create  new job record", async () => {
    const user = await createUserTest("emma");
    //Arrange + Act
    const result = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );

    //Assert
    expect(result?.lastRunAt).toBeNull();
    expect(result?.id).toBeDefined();
    expect(result).toMatchObject(createJobEntity);
    const [created] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, result?.id as number));
    expect(created).toHaveProperty("id");
    expect(created?.createdAt).toBeInstanceOf(Date);
    expect(created?.updatedAt).toBeInstanceOf(Date);
    expect(created?.isActive).toBe(true);
    expect(created?.timeout).toBe(30000);
    expect(created?.nextRunAt).toEqual(new Date("2026-09-22T06:30:00.000Z"));
    expect(created?.maxRetries).toBe(3);
    expect(created?.retryDelay).toBe(60);
    expect(created?.userId).toBe(user.id);
  });

  it("should update job with no update data", async () => {
    const user = await createUserTest("emma");

    //Act
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );
    const [updated] = await jobRepo.update(created?.id as number, {});
    const [result] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, updated?.id as number));

    //Assert
    expect(updated?.id).toBe(created?.id);
    expect(updated?.name).toBe(created?.name);
    expect(updated?.userId).toBe(created?.userId);
    expect(updated?.cronExpression).toBe(created?.cronExpression);
    expect(updated?.createdAt).toEqual(created?.createdAt);
    expect(updated?.updatedAt).toEqual(created?.updatedAt);
    expect(result).toBeDefined();

    const [row] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, created?.id as number));

    expect(row).toBeDefined();
    expect(row?.id).toBe(created?.id);
    expect(row?.userId).toBe(user?.id);
    expect(row?.name).toBe(createJobEntity.name);
  });

  it("should update job object with actual data", async () => {
    //Arrange
    const updateObject: updateJobDTO = {
      name: "astro",
      description: "a ping for facebook",
      httpBody: {
        key: "abcd",
        page: 3,
        size: 50,
      },
      httpCommand: "http:facebook.com",
      httpMethod: "POST",
    };
    const user = await createUserTest("kwame");

    //Act
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );
    const [updated] = await jobRepo.update(created?.id as number, updateObject);
    const [result] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, updated?.id as number));

    //Assert
    expect(result?.httpMethod).toBe("POST");
    expect(updated).toMatchObject(updateObject);
    expect(updated?.userId).toBe(user.id);
    expect(updated?.id).toStrictEqual(created?.id);
    expect(updated?.createdAt).toStrictEqual(created?.createdAt);
    expect(updated?.cronExpression).toStrictEqual(created?.cronExpression);
    expect(result).toMatchObject(updateObject);
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created?.createdAt.getTime() as number,
    );
  });

  it("should find a job by id", async () => {
    const user = await createUserTest("kwabena");
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );

    const result = await jobRepo.findById(created?.id as number);
    expect(result).toBeDefined();
    expect(result?.id).toBe(created?.id);
    expect(result?.userId).toBe(user.id);
    expect(result?.name).toBe(createJobEntity.name);
    expect(result?.nextRunAt).toEqual(new Date("2026-09-22T06:30:00.000Z"));
  });

  it("should return undefined for finding job by id that doesn't exist", async () => {
    const result = await jobRepo.findById(5);
    expect(result).toBeUndefined();
  });

  it("should find all jobs for a user", async () => {
    const userOne = await createUserTest("kwesi");
    const userTwo = await createUserTest("kwame");

    const firstJob = await jobRepo.create(
      createJobEntity,
      userOne.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );

    const secondJob = await jobRepo.create(
      { ...createJobEntity, name: "orbit" },
      userTwo.id,
      new Date("2026-09-22T06:45:00.000Z"),
      null,
    );

    const thirdJob = await jobRepo.create(
      { ...createJobEntity, name: "nebula" },
      userTwo.id,
      new Date("2026-09-22T07:00:00.000Z"),
      null,
    );

    const result = await jobRepo.findAllByUser(userTwo.id, 20, 0);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(secondJob);
    expect(result).toEqual(expect.arrayContaining([secondJob, thirdJob]));
    expect(result.every((job) => job.userId === userTwo.id)).toBe(true);
  });

  it("should return only due active jobs", async () => {
    const user = await createUserTest("ama");
    const now = new Date("2026-09-22T07:00:00.000Z");
    const dueJob = await jobRepo.create(
      { ...createJobEntity, name: "dueNow" },
      user.id,
      new Date("2026-09-22T06:00:00.000Z"),
      null,
    );
    const futureJob = await jobRepo.create(
      { ...createJobEntity, name: "future" },
      user.id,
      new Date("2026-09-22T08:00:00.000Z"),
      null,
    );
    const inactiveJob = await jobRepo.create(
      { ...createJobEntity, name: "inactive" },
      user.id,
      new Date("2026-09-22T05:00:00.000Z"),
      null,
    );
    const exactTimeJob = await jobRepo.create(
      { ...createJobEntity, name: "exactJobTime" },
      user.id,
      now,
      null,
    );
    const milliLateJob = await jobRepo.create(
      { ...createJobEntity, name: "exactJobTime" },
      user.id,
      new Date("2026-09-22T07:00:00.001Z"),
      null,
    );
    const milliEarlyJob = await jobRepo.create(
      { ...createJobEntity, name: "exactJobTime" },
      user.id,
      new Date("2026-09-22T06:59:59.999Z"),
      null,
    );

    await jobRepo.toggleActive(inactiveJob?.id as number);

    const result = await jobRepo.findDueJobs(now);

    expect(result).toHaveLength(3);
    expect(result.map((job) => job.id)).not.toContain(futureJob?.id);
    expect(result.map((job) => job.id)).not.toContain(inactiveJob?.id);
    expect(result.map((job) => job.id)).toContain(exactTimeJob?.id);
    expect(result.map((job) => job.id)).toContain(milliEarlyJob?.id);
    expect(result.map((job) => job.id)).toContain(dueJob?.id);
    expect(result.map((job) => job.id)).not.toContain(milliLateJob?.id);
    expect(result.every((job) => job.isActive && job.nextRunAt <= now)).toBe(
      true,
    );
  });

  it("should toggle the active state of a job", async () => {
    const user = await createUserTest("wlinom");
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );

    const toggledOff = await jobRepo.toggleActive(created?.id as number);
    const toggledOn = await jobRepo.toggleActive(created?.id as number);

    expect(toggledOff?.isActive).toBe(false);
    expect(toggledOn?.isActive).toBe(true);
  });

  it("should delete a job record", async () => {
    const user = await createUserTest("ken");
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );
    const [countBefore] = await db.select({ count: count() }).from(Job);

    await jobRepo.delete(created?.id as number);

    const [countAfter] = await db.select({ count: count() }).from(Job);

    const [result] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, created?.id as number));

    expect(countBefore!.count - countAfter!.count).toEqual(1);
    expect(result).toBeUndefined();
  });

  it("should update the last and next run times", async () => {
    const user = await createUserTest("emma");
    const created = await jobRepo.create(
      createJobEntity,
      user.id,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );

    const lastRunAt = new Date("2026-09-22T06:20:00.000Z");
    const nextRunAt = new Date("2026-09-22T06:35:00.000Z");

    const result = await jobRepo.updateRunTimes(
      created?.id as number,
      lastRunAt,
      nextRunAt,
    );
    const [updated] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, created!.id));

    expect(updated).toBeDefined();
    expect(updated?.cronExpression).toEqual(created?.cronExpression);
    expect(updated?.description).toEqual(created?.description);
    expect(updated?.httpMethod).toEqual(created?.httpMethod);
    expect(updated?.name).toEqual(created?.name);
    expect(result?.lastRunAt).toEqual(lastRunAt);
    expect(result?.nextRunAt).toEqual(nextRunAt);
    expect(result?.id).toBe(created?.id);
  });
});

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
} from "../../../shared/helpers/test-setup.js";
import { NotificationRepository } from "../notification.repository.js";
import { JobRespository } from "../../Jobs/job.repository.js";
import type { createJobDTO } from "../../Jobs/job.types.js";
import type { createNotificationDTO } from "../notification.types.js";

describe("Notification repository integration test", () => {
  let notificationRepo: NotificationRepository;
  let jobRepo: JobRespository;

  beforeAll(async () => {
    await SetupTestInfra();
    notificationRepo = new NotificationRepository();
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

  const createNotificationEntity: createNotificationDTO = {
    type: "email",
    event: "failure",
    target: "owner@example.com",
    channelId: null,
  };

  async function createJobFor(userId: string, name = "astroverse") {
    return await jobRepo.create(
      { ...createJobEntity, name },
      userId,
      new Date("2026-09-22T06:30:00.000Z"),
      null,
    );
  }

  it("should create a new notification record", async () => {
    const user = await createUserTest("emma");
    const job = await createJobFor(user.id);

    //Act
    const result = await notificationRepo.create(
      createNotificationEntity,
      job?.id as number,
    );

    //Assert
    expect(result?.id).toBeDefined();
    expect(result).toMatchObject({
      ...createNotificationEntity,
      jobId: job?.id,
      enabled: true,
    });
  });

  it("should find a notification by id", async () => {
    const user = await createUserTest("kwabena");
    const job = await createJobFor(user.id);
    const created = await notificationRepo.create(
      createNotificationEntity,
      job?.id as number,
    );

    //Act
    const result = await notificationRepo.findById(created?.id as number);

    //Assert
    expect(result?.id).toBe(created?.id);
    expect(result?.jobId).toBe(job?.id);
    expect(result?.target).toBe(createNotificationEntity.target);
  });

  it("should find only notifications for one job", async () => {
    const user = await createUserTest("kwesi");
    const jobOne = await createJobFor(user.id, "one");
    const jobTwo = await createJobFor(user.id, "two");

    const first = await notificationRepo.create(
      createNotificationEntity,
      jobOne?.id as number,
    );
    const second = await notificationRepo.create(
      { ...createNotificationEntity, event: "success" },
      jobTwo?.id as number,
    );

    //Act
    const result = await notificationRepo.findAllByJobId(
      jobOne?.id as number,
      20,
      0,
    );
    const total = await notificationRepo.countByJobId(jobOne?.id as number);

    //Assert
    expect(result).toHaveLength(1);
    expect(result).toContainEqual(first);
    expect(result).not.toContainEqual(second);
    expect(total).toBe(1);
  });

  it("should toggle the enabled state of a notification", async () => {
    const user = await createUserTest("ama");
    const job = await createJobFor(user.id);
    const created = await notificationRepo.create(
      createNotificationEntity,
      job?.id as number,
    );

    //Act
    const toggledOff = await notificationRepo.toggleEnabled(
      created?.id as number,
    );
    const toggledOn = await notificationRepo.toggleEnabled(
      created?.id as number,
    );

    //Assert
    expect(toggledOff?.enabled).toBe(false);
    expect(toggledOn?.enabled).toBe(true);
  });

  it("should update a notification record", async () => {
    const user = await createUserTest("kwame");
    const job = await createJobFor(user.id);
    const created = await notificationRepo.create(
      createNotificationEntity,
      job?.id as number,
    );

    //Act
    const [updated] = await notificationRepo.update(created?.id as number, {
      event: "success",
    });

    //Assert
    expect(updated?.id).toBe(created?.id);
    expect(updated?.event).toBe("success");
    expect(updated?.target).toBe(createNotificationEntity.target);
  });

  it("should delete a notification record", async () => {
    const user = await createUserTest("ken");
    const job = await createJobFor(user.id);
    const created = await notificationRepo.create(
      createNotificationEntity,
      job?.id as number,
    );

    //Act
    await notificationRepo.delete(created?.id as number);

    //Assert
    const result = await notificationRepo.findById(created?.id as number);
    expect(result).toBeUndefined();
  });
});

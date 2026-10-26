import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import {
  CleanTestInfra,
  SetupTestInfra,
  TeardownTestInfra,
  redis,
} from "../../../shared/helpers/test-setup.js";
import { ScheduleQueue } from "../schedular.queue.js";

import type { queueDTO } from "../schedular.types.js";
describe("Schdular queue integration tests", () => {
  let queue: ScheduleQueue;
  beforeAll(async () => {
    await SetupTestInfra();
  });
  beforeEach(async () => {
    await CleanTestInfra();
    //Duplicate so close() quitting it never touches the shared test redis
    queue = new ScheduleQueue(redis.duplicate());
  });

  afterEach(async () => {
    await queue.close();
  });

  afterAll(async () => {
    await TeardownTestInfra();
  });

  it("should add a job to the queue ", async () => {
    //Arrange
    const queueJob: queueDTO = {
      jobId: "cron-123",
      userId: "user-123",
      priority: 1,
      delay: 100,
    };

    //Act
    await queue.add(queueJob);

     //queue.add is fire-and-forget in scheduleJob, so give the write a moment to land in Redis instead of racing it
    let result;
    for (let attempt = 0; attempt < 10; attempt++) {
      result = await queue.getQueue().getJob(queueJob.jobId);
      if (result) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    //Assert
    expect(result?.opts.attempts).toEqual(2);
    expect(result?.opts.removeOnComplete).toBe(true);
    expect(result?.delay).toEqual(queueJob.delay);
    expect(result?.data.jobId).toEqual(queueJob.jobId);
    expect(result?.name).toBe("execute-job");
    expect(result?.data.executionId).toBeNull();
    expect(result?.data.statusCode).toBeNull();
    expect(result?.priority).toEqual(queueJob.priority);
    expect(result?.data.userId).toEqual(queueJob.userId);
  });

  it("should delete job from queue", async () => {
    //Arrange
    const queueJob: queueDTO = {
      jobId: "cron-123",
      userId: "user-123",
      priority: 10,
      delay: 10000,
    };
    await queue.add(queueJob);

    //Act

    await queue.remove(queueJob.jobId);

    const result = await queue.getQueue().getJob(queueJob.jobId);

    //Assert
    expect(result).toBeUndefined();
  });
});

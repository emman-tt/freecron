import { Queue } from "bullmq";
import type { Job } from "bullmq";
import type { Redis } from "ioredis";
import type { queueDTO } from "./schedular.types.js";

export class ScheduleQueue {
  private queue;

  constructor(connection: Redis) {
    this.queue = new Queue("schedular", {
      connection,
    });
  }

  async add(data: queueDTO): Promise<Job> {
    return await this.queue.add(
      "execute-job",

      {
        //jobId prefix or starts with "cron" eg. "cron-5"
        jobId: data.jobId,
        userId: data.userId,
        executionId: null,
        statusCode: null,
        response: {
          headers: null,
          body: null,
        },
      },
      {
        jobId: data.jobId,
        priority: data.priority,
        delay: data.delay,
        attempts: process.env.NODE_ENV === "test" ? 2 : 5,
        backoff: {
          type: "exponential",
          delay: process.env.NODE_ENV === "test" ? 100 : 3000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async remove(jobId: string) {
    //It uses 1:1 for job id to be same as bull id
    await this.queue.remove(jobId);
  }

  getQueue() {
    return this.queue;
  }

  async close() {
    await this.queue.close();
  }
}

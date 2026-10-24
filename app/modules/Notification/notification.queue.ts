import { Queue, type Job } from "bullmq";
import type { Redis } from "ioredis";
import type { queueDTO } from "./notification.types.js";

export class NotificationQueue {
  private queue;

  constructor(connection: Redis) {
    this.queue = new Queue("notification", {
      connection,
    });
  }

  async add(data: queueDTO): Promise<Job> {
    return this.queue.add(
      "notification-queue",
      {
        notificationId: data.notificationId,
        userId: data.userId,
        executionId: data.executionId,
        event: data.event,
      },
      {
        jobId: `${data.notificationId}-exec-${data.executionId}`,
        attempts: process.env.NODE_ENV === "test" ? 2 : 3,
        backoff: {
          type: "exponential",
          delay: process.env.NODE_ENV === "test" ? 100 : 3000,
        },
        removeOnComplete: true,

        removeOnFail: true,
      },
    );
  }

  getQueue() {
    return this.queue;
  }

  async close() {
    await this.queue.close();
  }
}

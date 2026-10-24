import type { Redis } from "ioredis";
import type { NotificationQueue } from "./notification.queue.js";
import type { Job } from "bullmq";
import type {
  Execution as ExecutionType,
  Job as JobType,
  User as UserType,
} from "../../shared/types/entities.js";
import { Worker, UnrecoverableError } from "bullmq";
import { resend } from "../../shared/lib/mail.service.js";
import type { NotificationService } from "./notification.service.js";
import { workerLogger as logger } from "../../shared/lib/logger.service.js";
import {
  failedMail,
  successMail,
  type FailedMailParams,
  type SuccessMailParams,
} from "../../shared/helpers/email.js";
import type { Notification } from "../../shared/types/entities.js";
import type { JobService } from "../Jobs/job.service.js";
import type { ExecutionService } from "../Execution/execution.service.js";
import { slack } from "../../shared/lib/slack.service.js";
import { failedSlack, successSlack } from "../../shared/helpers/slack.js";

export class NotificationWorker {
  private worker: Worker;
  private notif: NotificationService;
  private jobService: JobService;
  private executionService: ExecutionService;

  constructor(
    connection: Redis,
    notif: NotificationService,
    jobService: JobService,
    executionService: ExecutionService,
  ) {
    this.notif = notif;
    this.jobService = jobService;
    this.executionService = executionService;
    this.worker = new Worker(
      "notification",
      async (job: Job) => {
        await this.Processor(job);
      },
      {
        connection: connection,
      },
    );

    this.registerListeners();
  }

  async close() {
    await this.worker.close();
  }

  async Processor(job: Job) {
    const data = job.data;
    const notificationId = Number(data.notificationId.split("-")[1]);
    const userId = data.userId as string;
    const executionId = data.executionId as number | undefined;

    const log = logger.child({
      notificationId,
      userId,
      executionId,
    });

    if (typeof executionId !== "number") {
      log.error({ notificationId }, "missing executionId in queue payload");
      throw new UnrecoverableError("missing executionId");
    }

    const notification = await this.notif.findOneSystem(notificationId, log);
    const [jobAndUser, execution] = await Promise.all([
      this.jobService.findJobAndUser(notification.jobId, log),
      this.executionService.findOneSystem(executionId, log),
    ]);

    if (notification.type === "email") {
      //Send email
      await this.EmailProcessor(
        notification,
        jobAndUser.job,
        jobAndUser.users,
        execution,
      );
    } else {
      //Send slack
      await this.SlackProcessor(
        notification,
        jobAndUser.job,
        jobAndUser.users,
        execution,
      );
    }
  }

  async SlackProcessor(
    notication: Notification,
    job: JobType,
    user: UserType,
    execution: ExecutionType,
  ): Promise<void> {
    try {
      if (notication.event === "success") {
        const _params: SuccessMailParams = {
          jobName: job.name,
          userName: user.name,
          status: execution.statusCode ?? 0,
          duration: execution.duration ?? 0,
          runAt: execution.startedAt.toISOString(),
          nextRun: job.nextRunAt.toISOString(),
          reportUrl: "",
        };

        await slack.chat.postMessage({
          text: successSlack(_params).text,
          blocks: successSlack(_params).blocks,
          channel: notication.channelId!,
        });
        return;
      }

      if (notication.event === "failure") {
        //Send slacks of failed jobs
        const _params: FailedMailParams = {
          jobName: job.name,
          userName: user.name,
          status: execution.statusCode ?? 0,
          duration: execution.duration ?? 0,
          runAt: execution.startedAt.toISOString(),
          nextRun: job.nextRunAt.toISOString(),
          retries: job.maxRetries,
          timeout: this.formatTimeout(job.timeout),
          error: execution.error || "Unknown error",
          // TODO(yours, later): `${APP_URL}/jobs/${job.id}/report` — same base URL as success mail
          reportUrl: "",
          // TODO(yours, later): `${APP_URL}/jobs/${job.id}/edit` — frontend edit page (saves via PUT /api/jobs/:jobId)
          fixUrl: "",
          command: job.httpCommand,
        };
        const data = await slack.chat.postMessage({
          text: failedSlack(_params).text,
          blocks: failedSlack(_params).blocks,
          channel: notication.channelId!,
        });

        return;
      }
    } catch (error) {
      //Log error here
    }
  }

  async EmailProcessor(
    notication: Notification,
    job: JobType,
    user: UserType,
    execution: ExecutionType,
  ): Promise<void> {
    //Build email

    if (notication.event === "success") {
      //Send emails of succesful jobs

      const _params: SuccessMailParams = {
        jobName: job.name,
        userName: user.name,
        status: execution.statusCode ?? 0,
        duration: execution.duration ?? 0,
        runAt: execution.startedAt.toISOString(),
        nextRun: job.nextRunAt.toISOString(),
        // TODO reportUrl (yours, later): `${APP_URL}/jobs/${job.id}/report` — base URL from env/config.
        reportUrl: "",
      };
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [notication.target],
        subject: `[FreeCron] Success: ${_params.jobName} (${_params.status}, ${this.formatDuration(_params.duration)})`,
        html: successMail(_params),
      });
      return;
    }

    if (notication.event === "failure") {
      //Send emails of failed jobs
      const _params: FailedMailParams = {
        jobName: job.name,
        userName: user.name,
        status: execution.statusCode ?? 0,
        duration: execution.duration ?? 0,
        runAt: execution.startedAt.toISOString(),
        nextRun: job.nextRunAt.toISOString(),
        retries: job.maxRetries,
        timeout: this.formatTimeout(job.timeout),
        error: execution.error || "Unknown error",
        // TODO(yours, later): `${APP_URL}/jobs/${job.id}/report` — same base URL as success mail
        reportUrl: "",
        // TODO(yours, later): `${APP_URL}/jobs/${job.id}/edit` — frontend edit page (saves via PUT /api/jobs/:jobId)
        fixUrl: "",
        command: job.httpCommand,
      };
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [notication.target],
        subject: `[FreeCron] Failed: ${job.name} (${execution.statusCode || "no response"})`,
        html: failedMail(_params),
      });
      return;
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private formatTimeout(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    return `${Number.isInteger(s) ? s.toString() : s.toFixed(1)}s`;
  }

  registerListeners() {
    this.worker.on("completed", (job: Job) => {
      const data = job.data as {
        notificationId?: string;
        userId?: string;
        executionId?: number;
      };
      logger.info(
        {
          notificationId: data.notificationId,
          userId: data.userId,
          executionId: data.executionId,
        },
        "notification delivered",
      );
    });
    this.worker.on("failed", (job: Job | undefined, err: Error) => {
      const data = job?.data as
        | {
            notificationId?: string;
            userId?: string;
            executionId?: number;
          }
        | undefined;
      logger.error(
        {
          notificationId: data?.notificationId,
          userId: data?.userId,
          executionId: data?.executionId,
          err: err?.message,
        },
        "notification delivery failed",
      );
    });
  }
}

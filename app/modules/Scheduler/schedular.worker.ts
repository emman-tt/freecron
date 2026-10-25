import { Worker, Job } from "bullmq";
import type { Redis } from "ioredis";
import type { JobService } from "../Jobs/job.service.js";
import type { queueResponse } from "./schedular.types.js";
import type { updateJobDTO } from "../Jobs/job.types.js";
import type { ExecutionService } from "../Execution/execution.service.js";
import { workerLogger as logger } from "../../shared/lib/logger.service.js";
import { NotificationService } from "../Notification/notification.service.js";
export class ScheduleWorker {
  private worker: Worker;
  private connection: Redis;
  private jobService: JobService;
  private executionService: ExecutionService;
  private notif: NotificationService;
  constructor(
    connection: Redis,
    jobService: JobService,
    executionService: ExecutionService,
    notif: NotificationService,
  ) {
    this.connection = connection;
    this.jobService = jobService;
    this.notif = notif;
    this.executionService = executionService;
    this.worker = new Worker(
      "schedular",
      async (job: Job) => {
        await this.Processor(job);
      },
      {
        connection,
      },
    );
    this.registerEventListeners();
  }

  getWorker() {
    return this.worker;
  }

  async close() {
    await this.worker.close();
    //BullMQ does not quit connections passed to it by the caller
    if (this.connection.status !== "end") {
      await this.connection.quit();
    }
  }

  registerEventListeners() {
    this.worker.on("completed", (job: Job) => {
      const jobData = job.data;
      const jobId = Number(jobData.jobId.split("-")[1]);
      const userId = jobData.userId as string;

      const log = logger.child({
        jobId: jobId,
        userId: userId,
      });
      if (jobData.executionId == null) {
        log.error(
          {
            jobId,
            filename: "schedular.worker.ts",
            functionname: "ScheduleWorker.on-completed",
          },
          "missing executionId, skipping notify",
        );
        return;
      }
      this.notif.notify(jobId, jobData.executionId, "success", userId, log);
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      const jobData = job?.data;
      const jobId = Number(jobData.jobId.split("-")[1]);
      const userId = jobData.userId as string;

      const log = logger.child({
        jobId: jobId,
        userId: userId,
      });
      if (jobData.executionId == null) {
        log.error(
          {
            jobId,
            filename: "schedular.worker.ts",
            functionname: "ScheduleWorker.on-failed",
          },
          "missing executionId, skipping notify",
        );
        return;
      }
      this.notif.notify(jobId, jobData.executionId, "failure", userId, log);
    });
  }

  async Processor(job: Job): Promise<void> {
    const jobData = job.data as queueResponse;
    const jobId = Number(jobData.jobId.split("-")[1]);
    let isHttpError = false;

    //Logger base
    const log = logger.child({
      jobId: jobId,
      userId: jobData.userId,
    });

    log.info(
      {
        filename: "schedular.worker.ts",
        functionname: "ScheduleWorker.Processor",
      },
      "Job started",
    );

    //Create execution if missing (covers first attempt + retry after crash between create/updateData)
    if (!jobData.executionId) {
      //Create a new execution record with running status
      const execution = await this.executionService.create(
        jobId,
        jobData.userId,
        log,
      );

      await job.updateData({
        ...job.data,
        executionId: execution?.id,
      });
    }

    //Fetch job from db based on info from the queue
    const fetchedjob = await this.jobService.findJobSystem(jobId, log);

    const httpCallStart = Date.now();
    try {
      //Execute the command based on the http details

      log.debug(
        {
          httpCommand: fetchedjob.httpCommand,
          httpMethod: fetchedjob.httpMethod,
          executionId: job.data.executionId,
          attempts: job.opts.attempts,
          attemptsStarted: job.attemptsStarted,
          filename: "schedular.worker.ts",
          functionname: "ScheduleWorker.Processor",
        },
        "http command started",
      );

      const response = await fetch(`${fetchedjob.httpCommand}`, {
        method: fetchedjob.httpMethod,
        body:
          fetchedjob.httpMethod === "GET"
            ? null
            : JSON.stringify({ ...fetchedjob.httpBody }),
        headers: fetchedjob.httpHeader,
        signal: AbortSignal.timeout(fetchedjob.timeout),
      });

      const httpCallDuration = Date.now() - httpCallStart;
      const statusCode = response.status;
      //Throw custom http error (4xx,5xx) for the processor to catch and send to failed state
      if (!response.ok) {
        const errorBody = response.headers.get("Content-type")?.includes("text")
          ? await response.text()
          : await response.json();
        const errorMessage = `HTTP error , ${statusCode}`;
        isHttpError = true;
        //   Record execution result failed after total attempts
        const maxAttempts = job?.opts.attempts;
        const isLastAttempt = job.attemptsStarted >= maxAttempts!;

        if (isLastAttempt) {
          //Log http command fail permanently
          log.error(
            {
              httpCommand: fetchedjob.httpCommand,
              status: statusCode,
              durationMs: httpCallDuration,
              executionId: job.data.executionId,
              attemptsStarted: job.attemptsStarted,
              attempts: job.opts.attempts,
              error: errorMessage,
              filename: "schedular.worker.ts",
              functionname: "ScheduleWorker.Processor",
            },
            "http command failed permanently",
          );

          //Record execution failure
          await this.executionService.fail(
            jobId,
            job.data.executionId,
            {
              headers: response.headers,
              body: errorBody,
            },
            statusCode,
            new Date(),
            errorMessage,
            log,
          );

          //Update lastRunAt in DB for the job after completion
          const updateData: updateJobDTO = {
            lastRunAt: new Date(),
          };

          await this.jobService.update(jobId, updateData, jobData.userId, log);

          //    Sends notifications to the user - Notification service needed
        } else {
          //Log http command fail but more retries
          log.warn(
            {
              httpCommand: fetchedjob.httpCommand,
              status: statusCode,
              durationMs: httpCallDuration,
              executionId: job.data.executionId,
              attemptsStarted: job.attemptsStarted,
              attempts: job.opts.attempts,
              error: errorMessage,
              filename: "schedular.worker.ts",
              functionname: "ScheduleWorker.Processor",
            },
            "http command failed",
          );
        }

        throw new Error(errorMessage);
      }

      const body = response.headers.get("Content-type")?.includes("text")
        ? await response.text()
        : await response.json();

      //Log http command successful
      log.info(
        {
          httpCommand: fetchedjob.httpCommand,
          httpMethod: fetchedjob.httpMethod,
          executionId: job.data.executionId,
          status: statusCode,
          durationMs: httpCallDuration,
          attempts: job.opts.attempts,
          attemptsStarted: job.attemptsStarted,
          filename: "schedular.worker.ts",
          functionname: "ScheduleWorker.Processor",
        },
        "http command successful",
      );

      //   Record execution result success
      await this.executionService.complete(
        jobId,
        jobData.userId,
        job.data.executionId,
        {
          headers: response.headers,
          body: body,
        },
        statusCode,
        new Date(),
        log,
      );

      //    Update lastRunAt in DB for the job after completion
      const updateData: updateJobDTO = {
        lastRunAt: new Date(),
      };

      await this.jobService.update(jobId, updateData, jobData.userId, log);
    } catch (error: any) {
      const httpCallDuration = Date.now() - httpCallStart;
      if (isHttpError) {
        // Re-throw the original HTTP error so BullMQ keeps the real
        // message as the job's failed reason (an empty Error loses it).
        throw error;
      }

      //Errors including timeout , network errors and unforseen errors

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      //   Record execution result failed after total attempts
      const maxAttempts = job?.opts.attempts;
      const isLastAttempt = job.attemptsStarted >= maxAttempts!;

      if (isLastAttempt) {
        //Log http command failed permanently
        log.error(
          {
            httpCommand: fetchedjob.httpCommand,
            status: error?.status ?? 0,
            durationMs: httpCallDuration,
            executionId: job.data.executionId,
            attemptsStarted: job.attemptsStarted,
            attempts: job.opts.attempts,
            error: errorMessage,
            filename: "schedular.worker.ts",
            functionname: "ScheduleWorker.Processor",
          },
          "http command failed permanently",
        );

        //Fail exectution
        await this.executionService.fail(
          jobId,
          job.data.executionId,
          {
            headers: null,
            body: errorMessage,
          },
          0,
          new Date(),
          errorMessage,
          log,
        );

        //    Update lastRunAt in DB for the job after completion
        const updateData: updateJobDTO = {
          lastRunAt: new Date(),
        };

        await this.jobService.update(jobId, updateData, jobData.userId, log);

        //    Sends notifications to the user - Notification service needed
      } else {
        //Log http command fail but more retries
        log.warn(
          {
            httpCommand: fetchedjob.httpCommand,
            status: error?.status ?? 0,
            durationMs: httpCallDuration,
            executionId: job.data.executionId,
            attemptsStarted: job.attemptsStarted,
            attempts: job.opts.attempts,
            error: errorMessage,
            filename: "schedular.worker.ts",
            functionname: "ScheduleWorker.Processor",
          },
          "http command failed",
        );
      }

      throw error;
    }
  }
}

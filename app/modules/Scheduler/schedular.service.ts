import type { ScheduleQueue } from "./schedular.queue.js";
import type { queueDTO } from "./schedular.types.js";
import cron from "node-cron";
import type { CronService } from "../../shared/lib/cron.service.js";
import { JobRespository } from "../Jobs/job.repository.js";
import type { Logger } from "pino";
import {
  workerLogger as logger,
  watchManLogger,
} from "../../shared/lib/logger.service.js";
export class SchedularService {
  private queue: ScheduleQueue;
  private cronManager: CronService;
  private jobRepo: JobRespository;
  constructor(
    queue: ScheduleQueue,
    cronManager: CronService,
    jobRepo: JobRespository,
  ) {
    this.queue = queue;
    this.cronManager = cronManager;
    this.jobRepo = jobRepo;
  }

  scheduleJob(jobId: number, userId: string, delay: number, log: Logger) {
    //Queue and schedule jobs with delays in the bull
    const id = `cron-${jobId}`;
    const queueEntity: queueDTO = {
      jobId: id,
      userId: userId,
      priority: 10,
      delay: delay,
    };
    this.queue.add(queueEntity);

    //Log job scheduled
    log.info(
      {
        jobId: jobId,
        userId: userId,
        queueId: id,
        delayMs: delay,
        priority: 10,
      },
      "job scheduled with delay",
    );
  }

  unscheduleJob(jobId: number, log: Logger) {
    const id = `cron-${jobId}`;
    this.queue.remove(id);

    //Log job unscheduled
    log.info(
      {
        jobId: jobId,
        queueId: id,
      },
      "job unscheduled",
    );
  }

  async runJobNow(jobId: number, userId: string, log: Logger) {
    //Queue  and run jobs immediately with higher priority of 1 instead of 10 and no delay
    const id = `cron-${jobId}`;

    const queueEntity: queueDTO = {
      jobId: id,
      userId: userId,
      priority: 1,
      delay: 0,
    };
    this.queue.add(queueEntity);
    //Log job scheduled now
    log.info(
      {
        jobId: jobId,
        userId: userId,
        queueId: id,
        priority: 1,
        delay: 0,
      },
      "job scheduled and run now",
    );
  }

  async findDueJobs() {
    cron.schedule("* * * * * *", async () => {
      //Logger base
      const log = watchManLogger;

      //Cron runs every minute to find due jobs
      const startMs = Date.now();
      const fetchedJobs = await this.jobRepo.findDueJobs(new Date());
      const queryDuration = Date.now() - startMs;

      //Log when due jobs query slows ( > 100ms)
      if (queryDuration > 100) {
        log.warn(
          {
            count: fetchedJobs.length,
            queryDuration: queryDuration,
          },
          "due jobs query is slow",
        );
      }

      if (fetchedJobs.length > 0) {
        log.debug(
          { count: fetchedJobs.length, queryDuration: queryDuration },
          "due jobs found",
        );
      }

      for (const each of fetchedJobs) {
        //The next run at of each job fetched gets calculated and saved in db to avoid double queuing the next minute
        const nextRunAt = this.cronManager.findNextRun(each.cronExpression);

        await this.jobRepo.updateRunTimes(each.id, new Date(), nextRunAt);

        //Queue these unqueued jobs in the broker
        this.scheduleJob(each.id, each.userId, 0, log);
      }
    });
  }
}

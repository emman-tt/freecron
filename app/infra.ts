import { cronManager } from "./shared/lib/cron.service.js";
import { jobRepo, JobRespository } from "./modules/Jobs/job.repository.js";
import { SharedCacheRepository } from "./shared/repositories/cache.repository.js";
import {
  executionRepo,
  ExecutionRespository,
} from "./modules/Execution/execution.repository.js";
import { ScheduleQueue } from "./modules/Scheduler/schedular.queue.js";
import { RedisConnection } from "./shared/lib/redis.service.js";
import { JobService } from "./modules/Jobs/job.service.js";
import { JobController } from "./modules/Jobs/job.controller.js";
import { SchedularService } from "./modules/Scheduler/schedular.service.js";
import { ExecutionService } from "./modules/Execution/execution.service.js";
import { ExecutionController } from "./modules/Execution/execution.controller.js";
import { notificationRepo } from "./modules/Notification/notification.repository.js";
import { NotificationService } from "./modules/Notification/notification.service.js";
import { userRepo } from "./modules/Users/user.repository.js";
import { UserService } from "./modules/Users/user.service.js";
import { UserController } from "./modules/Users/user.controller.js";
import { NotificationController } from "./modules/Notification/notification.controller.js";
import { NotificationQueue } from "./modules/Notification/notification.queue.js";
import { ScheduleWorker } from "./modules/Scheduler/schedular.worker.js";

const cacheRepo = new SharedCacheRepository(RedisConnection());
const scheduleQueue = new ScheduleQueue(RedisConnection());
const NotifQueue = new NotificationQueue(RedisConnection());
const scheduler = new SchedularService(scheduleQueue, cronManager, jobRepo);
const jobService = new JobService(jobRepo, cronManager, cacheRepo, scheduler);
const executionService = new ExecutionService(executionRepo, jobService);
const userService = new UserService(userRepo);
const notificationService = new NotificationService(
  notificationRepo,
  jobService,
  cacheRepo,
  NotifQueue,
);
const jobController = new JobController(cronManager, jobService);
const executionController = new ExecutionController(executionService);
const notificationController = new NotificationController(notificationService);
const userController = new UserController(userService);
const worker = new ScheduleWorker(
  RedisConnection(),
  jobService,
  executionService,
  notificationService,
);

export {
  jobService,
  scheduler,
  executionService,
  userService,
  notificationService,
  worker,
  scheduleQueue,
  jobController,
  executionController,
  notificationController,
  userController,
};

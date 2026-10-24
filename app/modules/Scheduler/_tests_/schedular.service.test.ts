import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import cron from "node-cron";
import { SchedularService } from "../schedular.service.js";
import type { ScheduleQueue } from "../schedular.queue.js";
import type { JobRespository } from "../../Jobs/job.repository.js";
import { CronService } from "../../../shared/lib/cron.service.js";
import type { queueDTO } from "../schedular.types.js";
import type { jobResponseDTO } from "../../Jobs/job.types.js";
import type { Job as JobType } from "../../../shared/types/entities.js";
import type { Logger } from "pino";

describe("Scheduler Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const queueParams = {
    jobId: "cron-8",
    userId: "user-123",
    priority: 10,
    delay: 30000,
  };

  const timeDTO = {
    lastRunAt: new Date(),
    nextRunAt: new Date("2026-09-14T06:30:00.000Z"),
  };

  const queue = {
    add: jest.fn<(data: queueDTO) => void>(),
    remove: jest.fn<(jobId: string) => void>(),
  };

  const jobRepo = {
    findDueJobs: jest.fn<() => Promise<JobType[]>>(),
    updateRunTimes:
      jest.fn<
        (id: number, lastRunAt: Date, nextRunAt: Date) => jobResponseDTO
      >(),
  };

  const cronManager = {
    findNextRun: jest.fn<(cron: string) => Date>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const schedulerService = new SchedularService(
    queue as unknown as ScheduleQueue,

    cronManager as unknown as CronService,
    jobRepo as unknown as JobRespository,
  );

  it("should schedule a job or add to queue with  default priority", () => {
    schedulerService.scheduleJob(8, "user-123", 30000, mockLog);
    expect(queue.add).toHaveBeenCalledWith(queueParams);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 8, delayMs: 30000 }),
      "job scheduled with delay",
    );
  });

  it("should  unschedule a job or remove from queue ", () => {
    schedulerService.unscheduleJob(8, mockLog);
    expect(queue.remove).toHaveBeenCalledWith("cron-8");
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 8 }),
      "job unscheduled",
    );
  });

  it("should run a job now and immediately with the highest priority", () => {
    schedulerService.runJobNow(8, "user-123", mockLog);

    expect(queue.add).toHaveBeenCalledWith({
      ...queueParams,
      delay: 0,
      priority: 1,
    });
  });

  it("should find all due jobs with node:cron and reschedule each job", async () => {
    const dueJobs: JobType = {
      id: 9,
      userId: "user-123",
      cronExpression: "*/5 * * * *",
      name: "astroverse",
      httpBody: {},
      httpCommand: "https://google.com",
      httpHeader: {},
      httpMethod: "GET",
      timeout: 30000,
      isActive: true,
      description: null,
      maxRetries: 3,
      retryDelay: 60,
      lastRunAt: timeDTO.lastRunAt,
      nextRunAt: timeDTO.nextRunAt,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const nextRunAt = new Date("2026-09-12T10:00:00.000Z");
    jobRepo.findDueJobs.mockResolvedValue([dueJobs]);
    cronManager.findNextRun.mockReturnValue(nextRunAt);

    const scheduleSpy = jest.spyOn(cron, "schedule") as jest.MockedFunction<
      typeof cron.schedule
    >;

    scheduleSpy.mockImplementation(((
      ..._args: Parameters<typeof cron.schedule>
    ) => {
      return {} as ReturnType<typeof cron.schedule>;
    }) as typeof cron.schedule);

    await schedulerService.findDueJobs();

    expect(scheduleSpy).toHaveBeenCalledWith(
      "* * * * * *",
      expect.any(Function),
    );

    const scheduledCallback = scheduleSpy.mock
      .calls[0]![1] as () => Promise<void>;
    await scheduledCallback();

    expect(jobRepo.updateRunTimes).toHaveBeenCalledWith(
      9,
      expect.any(Date),
      nextRunAt,
    );

    expect(queue.add).toHaveBeenCalledWith({
      jobId: "cron-9",
      userId: "user-123",
      priority: 10,
      delay: 0,
    });
  });
});

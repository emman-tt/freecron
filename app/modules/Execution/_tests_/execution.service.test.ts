import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type {
  Execution as ExecutionType,
  Job,
} from "../../../shared/types/entities.js";
import { PermissionError } from "../../../shared/errors/business.errors.js";
import { ExecutionService } from "../execution.service.js";
import type { ExecutionRespository } from "../execution.repository.js";
import type { JobService } from "../../Jobs/job.service.js";
import type { updateDTO, userResponseDTO } from "../execution.types.js";
import { UnrecoverableError } from "bullmq";
import type { Logger } from "pino";

describe("Execution Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const jobId = 42;
  const userId = "user-1";

  const executionEntity: ExecutionType = {
    id: 1,
    jobId,
    status: "running",
    startedAt: new Date("2026-09-12T09:00:00.000Z"),
    completedAt: new Date("2026-09-12T09:00:05.000Z"),
    duration: 5000,
    statusCode: 200,
    error: null,
    response: { ok: true },
    updatedAt: new Date("2026-09-12T09:00:05.000Z"),
    createdAt: new Date("2026-09-12T09:00:00.000Z"),
  };

  const userResponseEntity: userResponseDTO = {
    id: executionEntity.id as number,
    jobId: executionEntity.jobId,
    startedAt: executionEntity.startedAt,
    status: executionEntity.status,
    completedAt: executionEntity.completedAt,
    duration: executionEntity.duration,
  };

  const jobEntity: Job = {
    id: jobId,
    userId,
    name: "test-job",
    description: null,
    cronExpression: "*/5 * * * *",
    httpHeader: {},
    httpCommand: "https://example.com",
    httpMethod: "GET",
    httpBody: {},
    isActive: true,
    maxRetries: 3,
    retryDelay: 60,
    timeout: 30000,
    lastRunAt: new Date("2026-09-12T08:55:00.000Z"),
    nextRunAt: new Date("2026-09-12T09:05:00.000Z"),
    updatedAt: new Date("2026-09-12T09:00:00.000Z"),
    createdAt: new Date("2026-09-12T08:50:00.000Z"),
  };

  const executionRepo = {
    create: jest.fn<(executeEntity: ExecutionType) => Promise<ExecutionType>>(),
    findById: jest.fn<(id: number) => Promise<ExecutionType | undefined>>(),
    findAllByJobId: jest.fn<
      (id: number, limit: number, offset: number) => Promise<ExecutionType[]>
    >(),
    countByJobId: jest.fn<(id: number) => Promise<number>>(),
    update: jest.fn<(data: updateDTO, id: number) => Promise<ExecutionType>>(),
  };

  const jobService = {
    findJobSystem: jest.fn<(jobId: number, log: Logger) => Promise<Job | null>>(),
  };

  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const executionService = new ExecutionService(
    executionRepo as unknown as ExecutionRespository,
    jobService as unknown as JobService,
  );

  it("should create a new execution row when the job belongs to the user", async () => {
    const createExecutionEntity: ExecutionType = {
      jobId: jobId,
      status: "running",
      error: null,
      response: null,
      completedAt: null,
      duration: null,
      statusCode: null,
      startedAt: new Date("2026-09-12T09:00:05.000Z"),
    };

    // Arrange
    jobService.findJobSystem.mockResolvedValue(jobEntity);
    executionRepo.create.mockResolvedValue(createExecutionEntity);

    // Act
    const result = await executionService.create(jobId, userId, mockLog);

    // Assert
    expect(jobService.findJobSystem).toHaveBeenCalledWith(jobId, mockLog);
    expect(executionRepo.create).toHaveBeenCalledTimes(1);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ status: "running" }),
      "execution created",
    );
    expect(result).toHaveProperty("status", "running");
    expect(result).toHaveProperty(
      "startedAt",
      new Date("2026-09-12T09:00:05.000Z"),
    );
  });

  it("should propagate UnrecoverableError when the job does not exist", async () => {
    // Arrange — findJobSystem throws UnrecoverableError for missing jobs
    // (execution.create performs no null check of its own)
    jobService.findJobSystem.mockRejectedValue(
      new UnrecoverableError("job not found"),
    );

    // Act / Assert
    await expect(
      executionService.create(jobId, userId, mockLog),
    ).rejects.toThrow(UnrecoverableError);

    expect(executionRepo.create).not.toHaveBeenCalled();
  });

  it("should   mark an execution as successful after completion of the job", async () => {
    const successUpdateDTO: updateDTO = {
      status: "success",
      completedAt: new Date("2026-09-12T09:00:05.000Z"),
      duration: 5000,
      statusCode: 200,
      error: null,
      response: { ok: true },
    };
    // Arrange
    jobService.findJobSystem.mockResolvedValue(jobEntity);
    executionRepo.findById.mockResolvedValue(executionEntity);
    executionRepo.update.mockResolvedValue({
      ...executionEntity,
      status: "success",
    });

    // Act
    const result = await executionService.complete(
      jobId,
      userId,
      executionEntity.id as number,
      { ok: true },
      200,
      new Date("2026-09-12T09:00:05.000Z"),
      mockLog,
    );

    // Assert
    expect(executionRepo.update).toHaveBeenCalledWith(
      successUpdateDTO,
      executionEntity.id!,
    );
    expect(result).toHaveProperty("status", "success");
  });

  it("should  mark an execution as failed after completion of the job", async () => {
    const failUpdateDTO: updateDTO = {
      status: "failed",
      completedAt: new Date("2026-09-12T09:00:05.000Z"),
      duration: 5000,
      statusCode: 500,
      error: "Internal server error",
      response: null,
    };
    // Arrange
    jobService.findJobSystem.mockResolvedValue(jobEntity);
    executionRepo.findById.mockResolvedValue(executionEntity);
    executionRepo.update.mockResolvedValue({
      ...executionEntity,
      status: "failed",
    });

    // Act
    const result = await executionService.fail(
      jobId,
      executionEntity.id as number,
      null,
      500,
      new Date("2026-09-12T09:00:05.000Z"),
      "Internal server error",
      mockLog,
    );

    // Assert
    expect(executionRepo.update).toHaveBeenCalledWith(failUpdateDTO, executionEntity.id!);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Internal server error" }),
      "execution failed ",
    );
    expect(result).toEqual({ ...executionEntity, status: "failed" });
  });

  it("should return all execution rows  for a job", async () => {
    // Arrange
    executionRepo.findAllByJobId.mockResolvedValue([
      executionEntity,
      executionEntity,
    ]);
    executionRepo.countByJobId.mockResolvedValue(2);

    // Act
    const result = await executionService.findAll(jobId, { page: 1, limit: 20 });

    // Assert
    expect(executionRepo.findAllByJobId).toHaveBeenCalledWith(jobId, 20, 0);
    expect(executionRepo.countByJobId).toHaveBeenCalledWith(jobId);
    expect(result.data).toEqual([userResponseEntity, userResponseEntity]);
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it("should return an empty array when a job has no executions", async () => {
    // Arrange
    executionRepo.findAllByJobId.mockResolvedValue([]);
    executionRepo.countByJobId.mockResolvedValue(0);

    // Act
    const result = await executionService.findAll(jobId, { page: 1, limit: 20 });

    // Assert
    expect(result.data).toEqual([]);
    expect(result.meta).toMatchObject({ total: 0, totalPages: 0 });
  });
});

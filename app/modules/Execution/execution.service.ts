import {
  NotFoundError,
  PermissionError,
} from "../../shared/errors/business.errors.js";
import type { Execution as ExecutionType } from "../../shared/types/entities.js";
import type { JobService } from "../Jobs/job.service.js";
import type { ExecutionRespository } from "./execution.repository.js";
import type { updateDTO, userResponseDTO } from "./execution.types.js";
import {
  resolvePagination,
  toPaginated,
  type PaginatedResponse,
  type PaginationParams,
} from "../../shared/types/pagination.js";
import type { Logger } from "pino";
import { UnrecoverableError } from "bullmq";

export class ExecutionService {
  private executionRepo: ExecutionRespository;
  private jobService: JobService;
  constructor(executionRepo: ExecutionRespository, jobService: JobService) {
    this.executionRepo = executionRepo;
    this.jobService = jobService;
  }

  async create(jobId: number, userId: string, log: Logger) {
    const job = await this.jobService.findJobSystem(jobId, log);

    const executionEntity: ExecutionType = {
      jobId: job.id!,
      status: "running",
      error: null,
      response: null,
      completedAt: null,
      duration: null,
      statusCode: null,
      startedAt: new Date(),
    };

    const execution = await this.executionRepo.create(executionEntity);
    log.info(
      {
        executionId: execution?.id,
        status: execution?.status,
      },
      "execution created",
    );
    return execution;
  }

  async complete(
    jobId: number,
    userId: string,
    executionId: number,
    response: Record<string, unknown>,
    statusCode: number,
    completedAt: Date,
    log: Logger,
  ) {
    //Find the execution row
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      log.error(
        {
          executionId: executionId,
        },
        "execution not found by system",
      );
      throw new NotFoundError("Execution record not found");
    }

    //Build the update data  and calculate duration and update  status to success
    const duration = completedAt.getTime() - execution.startedAt.getTime();
    const updateEntity: updateDTO = {
      status: "success",
      statusCode: statusCode,
      response: response ?? null,
      error: null,
      completedAt: completedAt,
      duration: duration,
    };

    const updated = await this.executionRepo.update(updateEntity, execution.id);
    log.info(
      {
        executionId: execution.id,
        duration: duration,
      },
      "execution completed ",
    );
    return updated;
  }

  async fail(
    jobId: number,
    executionId: number,
    response: Record<string, unknown> | null,
    statusCode: number,
    completedAt: Date,
    error: string,
    log: Logger,
  ) {
    //Find the execution row
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      log.error(
        {
          executionId: executionId,
        },
        "execution not found by system",
      );
      throw new NotFoundError("Execution record not found");
    }

    //Build the update data  and calculate duration and update  status to fail
    const duration = completedAt.getTime() - execution.startedAt.getTime();
    const updateEntity: updateDTO = {
      status: "failed",
      statusCode: statusCode,
      response: response ?? null,
      completedAt: completedAt,
      error: error ?? null,
      duration: duration,
    };

    const updated = await this.executionRepo.update(updateEntity, execution.id);

    log.error(
      {
        executionId: execution.id,
        duration: updated?.duration,
        error: error,
      },
      "execution failed ",
    );

    return updated;
  }

  async findOneSystem(executionId: number, log: Logger): Promise<ExecutionType> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) {
      log.error({ executionId }, "execution not found by system");
      throw new UnrecoverableError("execution not found");
    }
    return execution as ExecutionType;
  }

  async findAll(
    jobId: number,
    { page, limit }: PaginationParams,
  ): Promise<PaginatedResponse<userResponseDTO>> {
    const { offset } = resolvePagination({ page, limit });

    const [executions, total] = await Promise.all([
      this.executionRepo.findAllByJobId(jobId, limit, offset),
      this.executionRepo.countByJobId(jobId),
    ]);

    const data = executions.map((item) => this.toResponseDTO(item));
    return toPaginated(data, total, { page, limit });
  }

  private toResponseDTO(data: ExecutionType): userResponseDTO {
    return {
      id: data.id as number,
      jobId: data.jobId,
      startedAt: data.startedAt,
      status: data.status,
      completedAt: data.completedAt,
      duration: data.duration,
    };
  }
}

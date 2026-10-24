import type { NextFunction, Request, Response } from "express";
import * as z from "zod";
import {
  InternalError,
  UnauthenticatedError,
  ValidationError,
} from "../../shared/errors/business.errors.js";
import type { ExecutionService } from "./execution.service.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../../shared/types/pagination.js";

export class ExecutionController {
  private executionService: ExecutionService;
  constructor(executionService: ExecutionService) {
    this.executionService = executionService;
  }
  async FindExecutions(req: Request, res: Response, next: NextFunction) {
    try {
      //validate
      const schema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
        page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT),
      });

      const check = schema.safeParse(req.query);
      if (!check.success) {
        const formatted = z.treeifyError(check.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId, page, limit } = check.data;

      //Call service
      const result = await this.executionService.findAll(jobId, {
        page,
        limit,
      });

      //Return resource response
      res.status(200).json({
        status: "success",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}

import type { NextFunction, Response, Request } from "express";
import { z } from "zod";
import type { CronService } from "../../shared/lib/cron.service.js";
import { ValidationError } from "../../shared/errors/business.errors.js";
import type { JobService } from "./job.service.js";
import type { JobFilters } from "./job.types.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../../shared/types/pagination.js";
export class JobController {
  private cronManager: CronService;
  private jobService: JobService;
  constructor(cronManager: CronService, jobService: JobService) {
    this.cronManager = cronManager;
    this.jobService = jobService;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const bodySchema = z
        .object({
          name: z
            .string()
            .trim()
            .min(1, "Job name should be more than one character"),
          cronExpression: z
            .string()
            .refine((value: string) => this.cronManager.validateCron(value), {
              error: "Invalid cron format for scheduling",
            }),
          httpMethod: z.enum(
            ["POST", "GET", "PATCH", "DELETE", "PUT"],
            "Invalid http command or not capitalized",
          ),
          description: z.string().nullable().default(null),
          httpBody: z.record(z.string(), z.unknown()).default({}),
          httpHeader: z.record(z.string(), z.string()).default({}),
          httpCommand: z.url("Invalid http command url format"),
        })
        .superRefine((val, ctx) => {
          if (
            val.httpMethod === "GET" &&
            Object.keys(val.httpBody).length > 0
          ) {
            ctx.addIssue({
              code: "custom",
              message: "Request with GET method cannot have body",
            });
          }
        });

      const check = bodySchema.safeParse(req.body);

      if (!check.success) {
        const formatted = z.prettifyError(check.error);
        throw new ValidationError(`${formatted}`);
      }

      const data = check.data;

      //create a new job
      const jobs = await this.jobService.create(data, req.userId, req.log);

      //Return resource response
      res.status(201).json({
        status: "success",
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  async findJob(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
      });

      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId } = paramsCheck.data;

      //Call service
      const job = await this.jobService.findJobUser(jobId, req.userId, req.log);

      //Return resource response
      res.status(200).json({
        status: "success",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
  async findAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .default(DEFAULT_LIMIT),
        // Flat filter params (?isActive=false&httpMethod=POST&name=backup).
        isActive: z
          .preprocess(
            (v: string) =>
              v === "true" ? true : v === "false" ? false : (v ?? undefined),
            z.boolean().optional(),
          )
          .optional(),
        httpMethod: z
          .enum(
            ["POST", "GET", "PATCH", "DELETE", "PUT"],
            "Invalid http command or not capitalized",
          )
          .optional(),
        name: z.string().trim().min(1).max(100).optional(),
      });

      const check = schema.safeParse(req.query);
      if (!check.success) {
        const formatted = z.treeifyError(check.error);
        throw new ValidationError(`${formatted}`);
      }

      const { page, limit, isActive, httpMethod, name } = check.data;
      const filters: JobFilters = {};
      if (isActive !== undefined) filters.isActive = isActive;
      if (httpMethod !== undefined) filters.httpMethod = httpMethod;
      if (name !== undefined) filters.name = name;

      //Call service
      const result = await this.jobService.findAllJobsUser(
        req.userId,
        { page, limit },
        filters,
        req.log,
      );

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
  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
      });

      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId } = paramsCheck.data;

      //Call service
      const job = await this.jobService.toggleActive(
        jobId,
        req.userId,
        req.log,
      );

      //Return resource response
      res.status(200).json({
        status: "success",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
      });

      const bodySchema = z.object({
        name: z
          .string()
          .trim()
          .min(1, "Job name should be more than one character")
          .optional(),
        description: z.string().nullable().optional(),
        cronExpression: z
          .string()
          .refine((value: string) => this.cronManager.validateCron(value), {
            error: "Invalid cron format for scheduling",
          })
          .optional(),
        httpMethod: z
          .enum(
            ["POST", "GET", "PATCH", "DELETE", "PUT"],
            "Invalid http command or not capitalized",
          )
          .optional(),
        httpCommand: z.url().optional(),
        httpBody: z.record(z.string(), z.unknown()).optional(),
        httpHeader: z.record(z.string(), z.string()).optional(),
        timeout: z
          .number()
          .int()
          .positive("Timeout must be a positive integer")
          .optional(),
      });

      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const bodyCheck = bodySchema.safeParse(req.body);
      if (!bodyCheck.success) {
        const formatted = z.treeifyError(bodyCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId } = paramsCheck.data;

      const payload = bodyCheck.data;

      const job = await this.jobService.update(
        jobId,
        payload,
        req.userId,
        req.log,
      );

      res.status(200).json({
        status: "success",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async runNow(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
      });

      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId } = paramsCheck.data;

      await this.jobService.runJobNow(jobId, req.userId, req.log);

      //202 Accepted — trigger accepted, the execution is created
      //asynchronously by the worker
      res.status(202).json({
        status: "success",
        data: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        jobId: z.coerce
          .number("job id is required")
          .int("job id should be valid number")
          .positive("job id should be positive"),
      });

      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId } = paramsCheck.data;

      //Call service
      const deleted = await this.jobService.delete(jobId, req.userId, req.log);

      //Return resource response
      res.status(200).json({
        status: "success",
        data: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
}

import type { NextFunction, Response, Request } from "express";
import * as z from "zod";
import { ValidationError } from "../../shared/errors/business.errors.js";
import type { NotificationService } from "./notification.service.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
} from "../../shared/types/pagination.js";

const paramsSchema = z.object({
  notificationId: z.coerce
    .number("notification id is required")
    .int("notification id should be valid number")
    .positive("notification id should be positive"),
});

function targetIssue(
  ctx: z.RefinementCtx,
  type: "email" | "slack",
  target: string,
) {
  const valid =
    type === "email"
      ? z.email().safeParse(target).success
      : z.url().safeParse(target).success;

  if (!valid) {
    ctx.addIssue({
      code: "custom",
      message: `Invalid target for notification type ${type}`,
      path: ["target"],
    });
  }
}

export class NotificationController {
  private notificationService: NotificationService;
  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const bodySchema = z
        .object({
          jobId: z
            .number("job id is required")
            .int("job id should be valid number")
            .positive("job id should be positive"),

          type: z.enum(["email", "slack"], "Invalid notification type"),
          event: z.enum(
            ["start", "failure", "success"],
            "Invalid notification event",
          ),
          channelId: z.string().nullable().default(null),
          target: z.string().trim().min(1).max(150),
          enabled: z.boolean().optional(),
        })
        .superRefine((val, ctx) => targetIssue(ctx, val.type, val.target));

      const check = bodySchema.safeParse(req.body);
      if (!check.success) {
        const formatted = z.treeifyError(check.error);
        throw new ValidationError(`${formatted}`);
      }

      const { jobId, type, event, target, enabled, channelId } = check.data;

      //create a new notification rule
      const notification = await this.notificationService.create(
        jobId,
        { type, event, target, enabled, channelId },
        req.userId,
        req.log,
      );

      //Return resource response
      res.status(201).json({
        status: "success",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { notificationId } = paramsCheck.data;

      //Call service
      const notification = await this.notificationService.findOne(
        notificationId,
        req.userId,
        req.log,
      );

      //Return resource response
      res.status(200).json({
        status: "success",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
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
      const result = await this.notificationService.findAllByJob(
        jobId,
        { page, limit },
        req.userId,
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

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { notificationId } = paramsCheck.data;

      //Call service
      const notification = await this.notificationService.toggleEnabled(
        notificationId,
        req.userId,
        req.log,
      );

      //Return resource response
      res.status(200).json({
        status: "success",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const bodySchema = z
        .object({
          type: z
            .enum(["email", "slack"], "Invalid notification type")
            .optional(),
          event: z
            .enum(["start", "failure", "success"], "Invalid notification event")
            .optional(),
          target: z.string().trim().min(1).max(150).optional(),
          enabled: z.boolean().optional(),
        })
        .superRefine((val, ctx) => {
          // The boundary can only validate what the payload carries.
          // A type change without its target would leave validation
          // against the stored row to nobody — so require both together.
          if (val.type !== undefined && val.target === undefined) {
            ctx.addIssue({
              code: "custom",
              message: "Target is required when changing notification type",
              path: ["target"],
            });
            return;
          }
          if (val.type !== undefined && val.target !== undefined) {
            targetIssue(ctx, val.type, val.target);
          }
        });

      const bodyCheck = bodySchema.safeParse(req.body);
      if (!bodyCheck.success) {
        const formatted = z.treeifyError(bodyCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { notificationId } = paramsCheck.data;

      const payload = bodyCheck.data;

      const notification = await this.notificationService.update(
        notificationId,
        payload,
        req.userId,
        req.log,
      );

      res.status(200).json({
        status: "success",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const paramsCheck = paramsSchema.safeParse(req.params);
      if (!paramsCheck.success) {
        const formatted = z.treeifyError(paramsCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const { notificationId } = paramsCheck.data;

      //Call service
      await this.notificationService.delete(
        notificationId,
        req.userId,
        req.log,
      );

      //Return resource response
      res.status(200).json({
        status: "success",
        data: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

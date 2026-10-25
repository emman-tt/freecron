import type { NextFunction, Response, Request } from "express";
import * as z from "zod";
import { ValidationError } from "../../shared/errors/business.errors.js";
import type { UserService } from "./user.service.js";

export class UserController {
  private userService: UserService;
  constructor(userService: UserService) {
    this.userService = userService;
  }

  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.find(req.userId, req.log);

      res.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
  

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        name: z
          .string()
          .trim()
          .min(1, "User name should be more than one character")
          .max(100)
          .optional(),
        image: z.string().trim().min(1).max(500).nullable().optional(),
      });

      const bodyCheck = bodySchema.safeParse(req.body);
      if (!bodyCheck.success) {
        const formatted = z.treeifyError(bodyCheck.error);
        throw new ValidationError(`${formatted}`);
      }

      const payload = bodyCheck.data;

      const user = await this.userService.update(req.userId, payload, req.log);

      res.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.delete(req.userId, req.log);

      res.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

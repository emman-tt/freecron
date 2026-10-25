import type { NextFunction, Request, Response } from "express";
import { DomainError } from "./business.errors.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof DomainError) {

    res.status(err.statusCode).json({
      status: "fail",
      error: err.name,
      message: err.message,
    });
    return;
  }

  //Unhandled system error — domain errors returned above never reach this
  req.log.error(
    {
      err: err.message,
      path: req.path,
      filename: "http.errors.ts",
      functionname: "errorHandler",
    },
    "unhandled system error",
  );
  res.status(500).json({
    status: "error",
    message: "Something went wrong on the server",
  });
}

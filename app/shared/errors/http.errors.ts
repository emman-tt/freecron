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

  //Logger needed here
  console.error("Unhandled System Error:", err);
  res.status(500).json({
    status: "error",
    message: "Something went wrong on the server",
  });
}

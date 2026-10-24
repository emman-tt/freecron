import { randomUUID } from "crypto";
import { reqLogger } from "../lib/logger.service.js";
import type { Logger } from "pino";
import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers["x-request-id"] ?? randomUUID();
  const start = Date.now();

  req.log = reqLogger.child({ requestId }) as Logger;

  req.log.info(
    { method: req.method, path: req.url, query: req.query, filename: "logger.ts", functionname: "requestLogger" },
    "request started",
  );

  res.on("finish", () => {
    req.log.info(
      {
        method: req.method,
        path: req.url,
        status: res.statusCode,
        durationMs: Date.now() - start,
        filename: "logger.ts",
        functionname: "(anonymous)",
      },
      "request finished",
    );
  });

  next();
}

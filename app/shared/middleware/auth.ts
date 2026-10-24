import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.service.js";
import { fromNodeHeaders } from "better-auth/node";
import { UnauthenticatedError } from "../errors/business.errors.js";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user.id) {
      throw new UnauthenticatedError();
    }

    req.userId = session.user.id;
    req.log.debug({ userId: req.userId, filename: "auth.ts", functionname: "authMiddleware" }, "user session attached");
    next();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      req.log.warn({ path: req.path, filename: "auth.ts", functionname: "authMiddleware" }, "unauthenticated request");
      return next(error);
    }
    req.log.error(
      {
        path: req.path,
        error: error instanceof Error ? error.message : String(error),
        filename: "auth.ts",
        functionname: "authMiddleware",
      },
      "session lookup failed",
    );

    return next(error);
  }
}

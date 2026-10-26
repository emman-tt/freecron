import dotenv from "dotenv";
dotenv.config();
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "./database/db.config.js";
import { worker, scheduler, closeInfra } from "./infra.js";
import { JobRouter } from "./modules/Jobs/job.routes.js";
import { ExecutionRouter } from "./modules/Execution/execution.route.js";
import { NotificationRouter } from "./modules/Notification/notification.routes.js";
import { UserRouter } from "./modules/Users/user.routes.js";
import { errorHandler } from "./shared/errors/http.errors.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./shared/lib/auth.service.js";
import { requestLogger } from "./shared/middleware/logger.js";
import { infraLogger } from "./shared/lib/logger.service.js";
import { authMiddleware } from "./shared/middleware/auth.js";

const PORT = process.env.PORT;
export const app: express.Express = express();

app.all("/api/auth/{*any}", requestLogger, toNodeHandler(auth));
app.use(express.json());

app.use("/api/jobs", requestLogger, authMiddleware, JobRouter);
app.use("/api/executions", requestLogger, authMiddleware, ExecutionRouter);
app.use(
  "/api/notifications",
  requestLogger,
  authMiddleware,
  NotificationRouter,
);
app.use("/api/users", requestLogger, authMiddleware, UserRouter);

app.use(errorHandler);

//Lifecycle logs (boot, drain, exit) run on the infra channel, never on the
//request logger — boot-shutdown is process state, not request traffic (D-13)
if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    infraLogger.info(
      {
        port: PORT,
        filename: "index.ts",
        functionname: "index.boot",
      },
      "server bound to port",
    );
  });

  //Watchman sweeps for due jobs
  scheduler.findDueJobs();

  //One-lane shutdown: the first arriving signal/defect opens the gate, the
  //rest dedupe through the flag. Fatal is the process saying goodbye for is
  //good — nothing after it can upgrade the level
  let shuttingDown = false;
  const shutDown = (cause: string, error?: unknown) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    infraLogger.fatal(
      {
        cause,
        error: error !== undefined ? String(error) : undefined,
        filename: "index.ts",
        functionname: "index.shutdown",
      },
      "server down — draining connections and closing infra",
    );

    server.close();
    server.closeAllConnections();
    closeInfra().finally(() => process.exit(error !== undefined ? 1 : 0));
    //If a close path wedges, the exit is not negotiable — force it
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGTERM", () => shutDown("SIGTERM"));
  process.on("SIGINT", () => shutDown("SIGINT"));
  process.on("uncaughtException", (error) =>
    shutDown("uncaughtException", error),
  );
  process.on("unhandledRejection", (reason) =>
    shutDown("unhandledRejection", reason),
  );
}

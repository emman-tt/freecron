import dotenv from "dotenv";
dotenv.config();
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "./database/db.config.js";
import { worker, scheduler } from "./infra.js";
import { JobRouter } from "./modules/Jobs/job.routes.js";
import { ExecutionRouter } from "./modules/Execution/execution.route.js";
import { NotificationRouter } from "./modules/Notification/notification.routes.js";
import { UserRouter } from "./modules/Users/user.routes.js";
import { errorHandler } from "./shared/errors/http.errors.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./shared/lib/auth.service.js";
import { requestLogger } from "./shared/middleware/logger.js";
import { reqLogger } from "./shared/lib/logger.service.js";
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

//Supertest attaches its own ephemeral server in tests — binding PORT here
//would leave a handle jest cannot exit from
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    reqLogger.info(
      {
        port: PORT,
        filename: "index.ts",
        functionname: "(anonymous)",
      },
      "server bound to port",
    );
  });

  //Watchman sweeps for due jobs
  scheduler.findDueJobs();
}

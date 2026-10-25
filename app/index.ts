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

// app.listen(PORT, () => {
//   try {
//     console.log(`Connected to the server on port ${PORT}`);
//   } catch (error) {
//     //Log server  binding error and config errors here
//   }
// });

scheduler.findDueJobs();

import express, { Router } from "express";
import { executionController } from "../../infra.js";
import { requestLogger } from "../../shared/middleware/logger.js";
const router: Router = express.Router();

router.get("/",  executionController.FindExecutions.bind(executionController));

export const ExecutionRouter = router;

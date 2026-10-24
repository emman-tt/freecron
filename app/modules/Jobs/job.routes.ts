import express, { Router } from "express";
import { jobController } from "../../infra.js";
import { requestLogger } from "../../shared/middleware/logger.js";
const router: Router = express.Router();

router.post("/", jobController.create.bind(jobController));
router.get("/", jobController.findAllJobs.bind(jobController));
router.get("/:jobId", jobController.findJob.bind(jobController));
router.patch("/:jobId", jobController.toggleActive.bind(jobController));
router.put("/:jobId", jobController.update.bind(jobController));
router.post("/:jobId", jobController.runNow.bind(jobController));
router.delete("/:jobId", jobController.delete.bind(jobController));

export const JobRouter = router;

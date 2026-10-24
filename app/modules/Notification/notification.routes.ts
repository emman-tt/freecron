import express, { Router } from "express";
import { notificationController } from "../../infra.js";
import { requestLogger } from "../../shared/middleware/logger.js";
const router: Router = express.Router();

router.post("/", notificationController.create.bind(notificationController));
router.get("/", notificationController.findAll.bind(notificationController));
router.get(
  "/:notificationId",
  notificationController.findOne.bind(notificationController),
);
router.patch(
  "/:notificationId",
  notificationController.toggle.bind(notificationController),
);
router.put(
  "/:notificationId",
  notificationController.update.bind(notificationController),
);
router.delete(
  "/:notificationId",
  notificationController.delete.bind(notificationController),
);

export const NotificationRouter = router;

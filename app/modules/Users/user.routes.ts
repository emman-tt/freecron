import express, { Router } from "express";
import { userController } from "../../infra.js";
const router: Router = express.Router();

router.get("/me", userController.find.bind(userController));
router.put("/me", userController.update.bind(userController));
router.delete("/me", userController.delete.bind(userController));

export const UserRouter = router;

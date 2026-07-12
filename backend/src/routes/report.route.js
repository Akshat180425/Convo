import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  reportMessage,
  reportUser,
  updateReportStatus,
} from "../controllers/report.controller.js";

const router = express.Router();

router.post("/messages/:id", protectRoute, reportMessage);
router.post("/users/:id", protectRoute, reportUser);
router.patch("/:id/status", updateReportStatus);

export default router;

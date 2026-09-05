import express from "express";
import {
  synthesizeActionsController,
  analyzeSentimentController,
} from "../controllers/analysisController.js";
import { authenticateFirebaseUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/synthesize-actions",
  authenticateFirebaseUser,
  synthesizeActionsController
);

router.post(
  "/analyze-sentiment",
  authenticateFirebaseUser,
  analyzeSentimentController
);

export default router;
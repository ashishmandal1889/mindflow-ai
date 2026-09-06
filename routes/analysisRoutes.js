import express from "express";
import {
  synthesizeActionsController,
  analyzeSentimentController,
} from "../controllers/analysisController.js";
import { authenticateFirebaseUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* Protect SMART action synthesis with Firebase authentication */
router.post(
  "/synthesize-actions",
  authenticateFirebaseUser,
  synthesizeActionsController
);

/* Protect sentiment analysis with Firebase authentication */
router.post(
  "/analyze-sentiment",
  authenticateFirebaseUser,
  analyzeSentimentController
);

export default router;
import express from "express";
import { chatController } from "../controllers/chatController.js";
import { authenticateFirebaseUser } from "../middleware/authMiddleware.js";

const router = express.Router();

/* Protect the AI chat endpoint with Firebase authentication */
router.post(
  "/chat",
  authenticateFirebaseUser,
  chatController
);

export default router;
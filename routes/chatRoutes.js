import express from "express";
import { chatController } from "../controllers/chatController.js";
import { authenticateFirebaseUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/chat",
  authenticateFirebaseUser,
  chatController
);

export default router;
import express from "express";

import {
  createInteractionController,
  getInteractionsController,
  getInteractionController,
  deleteInteractionController,
} from "../controllers/interactionController.js";

import { authenticateFirebaseUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all reflections for the authenticated user
router.get(
  "/interactions",
  authenticateFirebaseUser,
  getInteractionsController
);

// Get one reflection
router.get(
  "/interactions/:id",
  authenticateFirebaseUser,
  getInteractionController
);

// Create a reflection
router.post(
  "/interactions",
  authenticateFirebaseUser,
  createInteractionController
);

// Delete a reflection
router.delete(
  "/interactions/:id",
  authenticateFirebaseUser,
  deleteInteractionController
);

export default router;
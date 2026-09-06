import express from "express";

import {
  healthController,
  configController,
} from "../controllers/configController.js";

const router = express.Router();

/* Check whether the server is running */
router.get("/health", healthController);

/* Provide public Firebase client configuration */
router.get("/api/config", configController);

export default router;
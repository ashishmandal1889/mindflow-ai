import express from "express";
import {
  healthController,
  configController,
} from "../controllers/configController.js";

const router = express.Router();

router.get("/health", healthController);

router.get("/api/config", configController);

export default router;
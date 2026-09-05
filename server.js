import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import "./config/firebase.js";

import configRoutes from "./routes/configRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());

app.use(
  express.json({
    limit: "5mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  })
);

// ============================================================================
// STATIC FRONTEND
// ============================================================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ============================================================================
// MVC ROUTES
// ============================================================================

// Health + client configuration
app.use("/", configRoutes);

// Chat
app.use("/api", chatRoutes);

// AI analysis
app.use("/api", analysisRoutes);

// Interactions
app.use("/api", interactionRoutes);

// ============================================================================
// FRONTEND FALLBACK
// ============================================================================

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(
    "======================================================="
  );

  console.log(
    `🚀 MindFlow AI running on port ${PORT}`
  );

  console.log(
    "🏗️ Architecture: MVC + Services"
  );

  console.log(
    "🔐 Firebase Authentication: Enabled"
  );

  console.log(
    "🤖 AI Service: Enabled"
  );

  console.log(
    "🏷️ Cloud Run Label: dev-tutorial=cloud-run-ai-challenge"
  );

  console.log(
    "======================================================="
  );
});
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

const PORT = Number(process.env.PORT) || 8080;

/* Configure cross-origin requests */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* Parse JSON request bodies */
app.use(
  express.json({
    limit: "5mb",
  })
);

/* Parse URL-encoded request bodies */
app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb",
  })
);

/* Serve the frontend application */
app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* Register health and client configuration routes */
app.use("/", configRoutes);

/* Register chat routes */
app.use("/api", chatRoutes);

/* Register AI analysis routes */
app.use("/api", analysisRoutes);

/* Register interaction routes */
app.use("/api", interactionRoutes);

/* Return the frontend application for client-side routes */
app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/* Start the application server */
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    "======================================================="
  );
  console.log(
    `MindFlow AI running on port ${PORT}`
  );
  console.log(
    "Architecture: MVC + Services"
  );
  console.log(
    "Firebase Authentication: Configured"
  );
  console.log(
    "AI Service: Configured"
  );
  console.log(
    "Cloud Run: Ready"
  );
  console.log(
    "======================================================="
  );
});
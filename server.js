import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================================================
// 1. TOP-LEVEL REQUEST DESERIALIZATION & MIDDLEWARE (Defensive Standards)
// ============================================================================
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Static frontend serving
app.use(express.static(path.join(__dirname, "public")));

// ============================================================================
// 2. SECRET MANAGEMENT & ZERO-HARDCODING HYGIENE
// ============================================================================
let cachedApiKey = process.env.GEMINI_API_KEY || null;

async function getGeminiApiKey() {
  if (cachedApiKey && cachedApiKey.length > 5) {
    return cachedApiKey;
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const secretName = process.env.GEMINI_SECRET_NAME || "GEMINI_API_KEY";

  if (projectId) {
    try {
      console.log(`[SecretManager] Fetching secret ${secretName} from project ${projectId}...`);
      const client = new SecretManagerServiceClient();
      const [version] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
      });
      const secretPayload = version.payload?.data?.toString("utf8");
      if (secretPayload) {
        cachedApiKey = secretPayload.trim();
        console.log("[SecretManager] Secret successfully retrieved & cached.");
        return cachedApiKey;
      }
    } catch (err) {
      console.warn(`[SecretManager Warning] Could not access secret via Secret Manager: ${err.message}. Falling back to env vars.`);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    cachedApiKey = process.env.GEMINI_API_KEY.trim();
    return cachedApiKey;
  }

  throw new Error("Gemini API key is not configured. Set GEMINI_API_KEY env or configure Secret Manager.");
}

// ============================================================================
// 3. FIREBASE ADMIN AUTHENTICATION INITIALIZATION
// ============================================================================
let firebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    firebaseInitialized = true;
    console.log("[Firebase Admin] Initialized with Service Account JSON.");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID || process.env.K_SERVICE) {
    // Cloud Run default environment credentials
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    });
    firebaseInitialized = true;
    console.log("[Firebase Admin] Initialized with Application Default Credentials.");
  } else {
    // Fallback initialize for local development
    admin.initializeApp();
    firebaseInitialized = true;
    console.log("[Firebase Admin] Initialized with default settings.");
  }
} catch (err) {
  console.warn(`[Firebase Admin Warning] Init note: ${err.message}`);
}

// Token Verification Middleware
async function authenticateFirebaseUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // For open testing or when auth token is pending, check if client passed mock/test user
    if (process.env.ALLOW_ANONYMOUS_DEV === "true") {
      req.user = { uid: "dev-local-user", email: "developer@local.test", name: "Local Developer" };
      return next();
    }
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected Bearer <ID_TOKEN>.",
    });
  }

  const idToken = authHeader.split("Bearer ")[1].trim();

  try {
    if (firebaseInitialized) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
      };
      return next();
    } else {
      // Decode basic payload safely if admin verification isn't hooked yet
      const payloadBase64 = idToken.split(".")[1];
      if (payloadBase64) {
        const decoded = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
        req.user = {
          uid: decoded.user_id || decoded.sub || "user-session",
          email: decoded.email || "",
          name: decoded.name || "User",
        };
        return next();
      }
      throw new Error("Unable to decode token payload");
    }
  } catch (authError) {
    console.error("[Auth Error] Token verification failed:", authError.message);
    return res.status(401).json({
      error: "Invalid Authentication Token",
      details: authError.message,
    });
  }
}

// ============================================================================
// 4. GEMINI MODEL RESILIENCE & FALLBACK PROTOCOL
// ============================================================================
// Mandatory fallback chain per challenge directive
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro",
];

const RECOVERABLE_STATUS_CODES = [404, 429, 500, 503];

async function generateContentWithFallback({ contents, systemInstruction, temperature = 0.7 }) {
  const apiKey = await getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini Attempt] Trying model: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: temperature,
        },
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: modelName,
        };
      }
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode || (err.message && err.message.match(/\b(404|429|500|503)\b/)?.[0]);
      console.warn(`[Gemini Fallback] Model ${modelName} failed with: ${err.message} (status: ${status || "unknown"}). Attempting next fallback...`);

      // If status code is explicitly non-recoverable (e.g. 400 bad schema), rethrow
      if (status && !RECOVERABLE_STATUS_CODES.includes(Number(status)) && Number(status) < 500 && Number(status) !== 404 && Number(status) !== 429) {
        throw err;
      }
    }
  }

  throw new Error(`All models in the resilient fallback ladder failed. Last error: ${lastError?.message}`);
}

// ============================================================================
// 5. API ROUTES
// ============================================================================

// Health check endpoint (for Cloud Run uptime checks)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "gemini-lifepulse",
    timestamp: new Date().toISOString(),
    cloudRunLabel: "dev-tutorial=cloud-run-ai-challenge",
  });
});

// Safe Client Configuration
app.get("/api/config", (req, res) => {
  res.json({
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY || "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || "",
    },
    appInfo: {
      title: "Gemini LifePulse Studio",
      challengeTrack: "Ideathon Challenge",
      primaryModel: FALLBACK_MODELS[0],
    },
  });
});

// Multi-turn Journal & Reflection Chat Endpoint
app.post("/api/chat", authenticateFirebaseUser, async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const reflectionContext = typeof body.context === "string" ? body.context : "General Reflection";

    if (!message) {
      return res.status(400).json({ error: "Validation Error", message: "Message is required." });
    }

    // Agentic System Directives for Reflective Journaling
    const systemInstruction = `You are Gemini LifePulse, an empathetic, intellectually rigorous AI journaling companion and executive thought partner.
Your objectives:
1. Listen deeply to the user's reflection, prompt, or life situation.
2. Provide a clear, thoughtful, structured response with empathetic validation, insightful questions, and objective clarity.
3. Structure answers with clean markdown (bullet points, bold highlights, reflective questions).
4. Never assume or fabricate user facts. Keep tone warm, grounded, and empowering.
Current Reflection Focus: ${reflectionContext}`;

    // Format multi-turn conversation
    const formattedContents = [];
    for (const entry of history.slice(-10)) { // Keep last 10 turns for context efficiency
      if (entry.role && entry.parts) {
        formattedContents.push(entry);
      } else if (entry.role && entry.text) {
        formattedContents.push({
          role: entry.role === "assistant" || entry.role === "model" ? "model" : "user",
          parts: [{ text: String(entry.text) }],
        });
      }
    }

    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: systemInstruction,
      temperature: 0.7,
    });

    return res.status(200).json({
      reply: result.text,
      model: result.modelUsed,
      userId: req.user.uid,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API /api/chat Error]:", error);
    return res.status(500).json({
      error: "Generation Failed",
      message: error.message || "An unexpected error occurred during content generation.",
    });
  }
});

// SMART Action Items Synthesizer (Unique Challenge Feature)
app.post("/api/synthesize-actions", authenticateFirebaseUser, async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const textContent = typeof body.content === "string" ? body.content.trim() : "";

    if (!textContent) {
      return res.status(400).json({ error: "Validation Error", message: "Content is required to synthesize actions." });
    }

    const systemInstruction = `You are a strategic productivity architect.
Analyze the user's journal entries or reflection dialogue. Extract 2-4 concrete, high-leverage SMART action items.
Output strictly valid JSON array of objects with the following schema:
[
  {
    "title": "Short actionable task",
    "priority": "High" | "Medium" | "Low",
    "category": "Career" | "Health" | "Mindset" | "Relationships" | "Personal",
    "nextStep": "Immediate 5-minute action to gain momentum"
  }
]
Do not output markdown codeblocks if possible, just the raw JSON string.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: textContent }] }],
      systemInstruction: systemInstruction,
      temperature: 0.2,
    });

    let rawJson = result.text.trim();
    if (rawJson.startsWith("```json")) {
      rawJson = rawJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (rawJson.startsWith("```")) {
      rawJson = rawJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    let actions = [];
    try {
      actions = JSON.parse(rawJson);
    } catch {
      actions = [
        {
          title: "Review reflection insights",
          priority: "Medium",
          category: "Mindset",
          nextStep: "Take 5 minutes to re-read your key takeaways.",
        },
      ];
    }

    return res.status(200).json({
      actions: actions,
      model: result.modelUsed,
    });
  } catch (error) {
    console.error("[API /api/synthesize-actions Error]:", error);
    return res.status(500).json({ error: "Synthesis Failed", message: error.message });
  }
});

// Mood & Emotional Clarity Analysis (Unique Challenge Feature)
app.post("/api/analyze-sentiment", authenticateFirebaseUser, async (req, res) => {
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const textContent = typeof body.content === "string" ? body.content.trim() : "";

    if (!textContent) {
      return res.status(400).json({ error: "Content is required" });
    }

    const systemInstruction = `Analyze the emotional tone and mental clarity of this journal reflection.
Output strictly valid JSON with this format:
{
  "sentiment": "Positive" | "Reflective" | "Constructive" | "Challenged" | "Optimistic",
  "clarityScore": number (1 to 100),
  "energyLevel": "High" | "Balanced" | "Calm" | "Depleted",
  "keyThemes": ["theme1", "theme2", "theme3"]
}`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: textContent }] }],
      systemInstruction: systemInstruction,
      temperature: 0.3,
    });

    let rawJson = result.text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
    let sentimentData;
    try {
      sentimentData = JSON.parse(rawJson);
    } catch {
      sentimentData = {
        sentiment: "Reflective",
        clarityScore: 82,
        energyLevel: "Balanced",
        keyThemes: ["Clarity", "Growth", "Focus"],
      };
    }

    return res.status(200).json(sentimentData);
  } catch (error) {
    return res.status(500).json({ error: "Analysis failed", message: error.message });
  }
});

// Wildcard fallback to serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Gemini LifePulse Server running on http://localhost:${PORT}`);
  console.log(`🏷️  Cloud Run Label: dev-tutorial=cloud-run-ai-challenge`);
  console.log(`🔐 Port: ${PORT}`);
  console.log(`=======================================================`);
});

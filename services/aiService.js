import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./secretService.js";

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
];

const RECOVERABLE_STATUS_CODES = [404, 429, 500, 503];

async function generateContentWithFallback({
  contents,
  systemInstruction,
  temperature = 0.7,
  requestKey = null,
}) {
  const apiKey = await getGeminiApiKey(requestKey);

  // No API key → development fallback
  if (!apiKey) {
    console.warn(
      "[AI Service] No GEMINI_API_KEY found. Using simulated reflection."
    );

    return {
      text: generateSimulatedReflection(contents),
      modelUsed: "AI Reflection (Simulated)",
      simulated: true,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(
        `[AI Service] Requesting model: ${modelName}...`
      );

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature,
        },
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: modelName,
          simulated: false,
        };
      }
    } catch (err) {
      lastError = err;

      const status =
        err.status ||
        err.statusCode ||
        (
          err.message &&
          err.message.match(/\b(404|429|500|503)\b/)?.[0]
        );

      console.warn(
        `[AI Service] Model ${modelName} failed: ${err.message}`
      );

      if (
        status &&
        !RECOVERABLE_STATUS_CODES.includes(Number(status)) &&
        Number(status) < 500 &&
        Number(status) !== 404 &&
        Number(status) !== 429
      ) {
        throw err;
      }
    }
  }

  throw new Error(
    `All AI fallback models failed. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
}

function generateSimulatedReflection(contents) {
  const lastPrompt =
    contents[contents.length - 1]?.parts?.[0]?.text ||
    "your reflection";

  return `### 💡 Reflection & Insights

Thank you for sharing: **"${lastPrompt.substring(
    0,
    100
  )}..."**

Here are three key perspectives to consider:

- **Celebrate the Progress**: Acknowledging what went well reinforces positive cognitive feedback loops and builds resilience for future initiatives.

- **Unpack the Catalyst**: What specific decision, ritual, or collaboration enabled this success? Identifying the root cause turns good luck into a repeatable system.

- **Next Momentum Step**: What is one small, 5-minute action you can take today to build on this energy?

> **Tip:** Connect your AI service to activate live reflection responses.`;
}

export {
  generateContentWithFallback,
  FALLBACK_MODELS,
};
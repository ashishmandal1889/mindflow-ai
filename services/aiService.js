import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./secretService.js";

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
];

const RECOVERABLE_STATUS_CODES = [
  408,
  500,
  502,
  503,
  504,
];

const NETWORK_ERROR_CODES = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ENOTFOUND",
];

const REQUEST_TIMEOUT = 15000;
const MAX_ATTEMPTS = 3;

/* Create a delay between retry attempts */
function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* Determine whether an error is caused by a network failure */
function isNetworkError(error) {
  const message =
    error?.message?.toLowerCase() || "";

  const code = error?.code;

  return (
    NETWORK_ERROR_CODES.includes(code) ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket") ||
    message.includes("connection reset") ||
    message.includes("connection refused") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

/* Get the HTTP status code from an AI error */
function getErrorStatus(error) {
  return (
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    null
  );
}

/* Determine whether an error should be retried */
function isRecoverableError(error) {
  const status = getErrorStatus(error);

  return (
    isNetworkError(error) ||
    RECOVERABLE_STATUS_CODES.includes(status)
  );
}

/* Log Gemini request failures without exposing secrets */
function logGeminiError(model, attempt, error) {
  console.warn(
    `[AI Service] Model ${model} attempt ${attempt} failed.`
  );

  console.warn(
    "[AI Service] Error message:",
    error?.message || "Unknown error"
  );

  console.warn(
    "[AI Service] Error code:",
    error?.code || "N/A"
  );

  console.warn(
    "[AI Service] Error status:",
    error?.status || "N/A"
  );

  console.warn(
    "[AI Service] Error status code:",
    error?.statusCode ||
      error?.response?.status ||
      "N/A"
  );
}

/* Generate AI content with retry and local fallback */
async function generateContentWithFallback({
  contents,
  systemInstruction,
}) {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    console.warn(
      "[AI Service] Gemini API key is unavailable. Using local fallback."
    );

    return {
      text: generateLocalFallback(contents),
      modelUsed: "AI Reflection Fallback",
      simulated: true,
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  for (const model of FALLBACK_MODELS) {
    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        console.log(
          `[AI Service] Requesting model: ${model} (attempt ${attempt}/${MAX_ATTEMPTS})`
        );

        const response =
          await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              httpOptions: {
                timeout: REQUEST_TIMEOUT,
              },
            },
          });

        const text =
          typeof response?.text === "string"
            ? response.text.trim()
            : "";

        if (!text) {
          throw new Error(
            "Gemini returned an empty response."
          );
        }

        console.log(
          `[AI Service] Model ${model} succeeded.`
        );

        return {
          text,
          modelUsed: model,
          simulated: false,
        };
      } catch (error) {
        logGeminiError(
          model,
          attempt,
          error
        );

        const status = getErrorStatus(error);

        /* Stop immediately when the model or quota is unavailable */
        if (status === 404 || status === 429) {
          console.warn(
            `[AI Service] Gemini returned ${status}. Using local fallback.`
          );

          break;
        }

        const shouldRetry =
          isRecoverableError(error);

        if (
          shouldRetry &&
          attempt < MAX_ATTEMPTS
        ) {
          const delay =
            1000 *
              2 ** (attempt - 1) +
            Math.floor(
              Math.random() * 500
            );

          console.warn(
            `[AI Service] Temporary failure. Retrying in ${delay}ms...`
          );

          await sleep(delay);

          continue;
        }

        if (!shouldRetry) {
          console.warn(
            `[AI Service] Non-recoverable Gemini error for model ${model}.`
          );

          break;
        }
      }
    }
  }

  console.warn(
    "[AI Service] All Gemini requests failed. Using local fallback."
  );

  return {
    text: generateLocalFallback(contents),
    modelUsed: "AI Reflection Fallback",
    simulated: true,
  };
}

/* Generate a safe response when Gemini is unavailable */
function generateLocalFallback(contents) {
  const lastUserMessage =
    [...(contents || [])]
      .reverse()
      .find(
        (entry) =>
          entry?.role === "user" &&
          Array.isArray(entry?.parts)
      );

  const text =
    lastUserMessage?.parts
      ?.map(
        (part) => part?.text || ""
      )
      .join(" ")
      .trim();

  if (!text) {
    return (
      "Take a moment to identify the most important " +
      "thing you want to accomplish today. Start with " +
      "one small, clear action."
    );
  }

  return (
    "Your reflection shows that you are thinking about " +
    "making progress. A useful next step is to identify " +
    "one specific action you can complete today. " +
    "Start small, focus on what you can control, and " +
    "review your progress at the end of the day."
  );
}

export {
  generateContentWithFallback,
  FALLBACK_MODELS,
};
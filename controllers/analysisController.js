import { generateContentWithFallback } from "../services/aiService.js";

/**
 * SMART Action Items Synthesizer
 */
async function synthesizeActionsController(req, res) {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const textContent =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const clientKey =
      req.headers["x-gemini-api-key"] || null;

    if (!textContent) {
      return res.status(400).json({
        error: "Validation Error",
        message:
          "Content is required to synthesize actions.",
      });
    }

    const systemInstruction = `
Analyze the user's journal entries and extract 2-4 concrete, high-leverage SMART action items.

Output strictly valid JSON array:

[
  {
    "title": "Short actionable task",
    "priority": "High" | "Medium" | "Low",
    "category": "Career" | "Health" | "Mindset" | "Personal",
    "nextStep": "Immediate 5-minute action to gain momentum"
  }
]
`;

    try {
      const result = await generateContentWithFallback({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: textContent,
              },
            ],
          },
        ],
        systemInstruction,
        temperature: 0.2,
        requestKey: clientKey,
      });

      const rawJson = result.text
        .trim()
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();

      const actions = JSON.parse(rawJson);

      return res.status(200).json({
        actions,
        model: result.modelUsed,
      });
    } catch (error) {
      console.warn(
        "[SMART Actions] AI parsing failed. Using fallback actions.",
        error.message
      );

      return res.status(200).json({
        actions: [
          {
            title: "Document Key Insights",
            priority: "High",
            category: "Mindset",
            nextStep:
              "Write down 2 actionable learnings from today's session.",
          },
          {
            title: "Set 1 Weekly Milestone",
            priority: "Medium",
            category: "Career",
            nextStep:
              "Block 15 minutes on your calendar to focus on the top priority.",
          },
        ],
        model: "AI Reflection Fallback",
      });
    }
  } catch (error) {
    console.error(
      "[SMART Actions Controller Error]:",
      error
    );

    return res.status(500).json({
      error: "Synthesis Failed",
      message:
        error.message ||
        "Unable to synthesize action items.",
    });
  }
}

/**
 * Mood & Emotional Clarity Analysis
 */
async function analyzeSentimentController(req, res) {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const textContent =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const clientKey =
      req.headers["x-gemini-api-key"] || null;

    if (!textContent) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Content is required.",
      });
    }

    const systemInstruction = `
Analyze the emotional tone and mental clarity of the user's journal entry.

Output strictly valid JSON:

{
  "sentiment": "Positive" | "Reflective" | "Constructive" | "Challenged" | "Optimistic",
  "clarityScore": number,
  "energyLevel": "High" | "Balanced" | "Calm" | "Depleted",
  "keyThemes": ["theme1", "theme2", "theme3"]
}

The clarityScore must be a number between 1 and 100.
`;

    try {
      const result = await generateContentWithFallback({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: textContent,
              },
            ],
          },
        ],
        systemInstruction,
        temperature: 0.3,
        requestKey: clientKey,
      });

      const rawJson = result.text
        .trim()
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();

      const sentimentData = JSON.parse(rawJson);

      return res.status(200).json(sentimentData);
    } catch (error) {
      console.warn(
        "[Sentiment Analysis] AI parsing failed. Using fallback.",
        error.message
      );

      return res.status(200).json({
        sentiment: "Reflective",
        clarityScore: 88,
        energyLevel: "Balanced",
        keyThemes: [
          "Clarity",
          "Progress",
          "Focus",
        ],
      });
    }
  } catch (error) {
    console.error(
      "[Sentiment Controller Error]:",
      error
    );

    return res.status(500).json({
      error: "Analysis Failed",
      message:
        error.message ||
        "Unable to analyze reflection.",
    });
  }
}

export {
  synthesizeActionsController,
  analyzeSentimentController,
};
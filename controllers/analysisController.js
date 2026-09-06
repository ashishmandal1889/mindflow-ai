import { generateContentWithFallback } from "../services/aiService.js";

/* Synthesize SMART action items from a reflection */
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

    if (!textContent) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Content is required to synthesize actions.",
      });
    }

    /* Define the AI output format for SMART actions */
    const systemInstruction = `
Analyze the user's journal entry and extract 2-4 concrete, high-leverage SMART action items.

Return ONLY valid JSON.

[
  {
    "title": "Short actionable task",
    "priority": "High",
    "category": "Career",
    "nextStep": "Immediate 5-minute action to gain momentum"
  }
]

Rules:

- priority must be High, Medium, or Low
- category must be Career, Health, Mindset, or Personal
- nextStep must be specific and immediately actionable
- Do not include markdown
- Do not include explanations outside the JSON array
`;

    try {
      const result =
        await generateContentWithFallback({
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
        });

      const rawJson = cleanJsonResponse(result.text);
      const actions = JSON.parse(rawJson);

      if (!Array.isArray(actions)) {
        throw new Error("Invalid action format.");
      }

      const validPriorities = [
        "High",
        "Medium",
        "Low",
      ];

      const validCategories = [
        "Career",
        "Health",
        "Mindset",
        "Personal",
      ];

      const validActions = actions
        .filter(
          (action) =>
            action &&
            typeof action === "object" &&
            typeof action.title === "string" &&
            typeof action.priority === "string" &&
            typeof action.category === "string" &&
            typeof action.nextStep === "string" &&
            validPriorities.includes(action.priority) &&
            validCategories.includes(action.category)
        )
        .map((action) => ({
          title: action.title.trim(),
          priority: action.priority,
          category: action.category,
          nextStep: action.nextStep.trim(),
        }))
        .filter(
          (action) =>
            action.title &&
            action.nextStep
        )
        .slice(0, 4);

      if (validActions.length === 0) {
        throw new Error(
          "No valid action items returned."
        );
      }

      return res.status(200).json({
        actions: validActions,
        model: result.modelUsed,
        simulated: result.simulated || false,
      });
    } catch (error) {
      console.warn(
        "[SMART Actions] Using fallback actions."
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
            title: "Set One Weekly Milestone",
            priority: "Medium",
            category: "Career",
            nextStep:
              "Block 15 minutes to focus on your most important goal.",
          },
        ],
        model: "AI Reflection Fallback",
        simulated: true,
      });
    }
  } catch (error) {
    console.error(
      "[SMART Actions Controller] Analysis failed:",
      error
    );

    return res.status(500).json({
      error: "Synthesis Failed",
      message:
        "Unable to synthesize action items.",
    });
  }
}

/* Analyze emotional tone and mental clarity */
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

    if (!textContent) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Content is required.",
      });
    }

    /* Define the AI output format for sentiment analysis */
    const systemInstruction = `
Analyze the emotional tone and mental clarity of the user's journal entry.

Return ONLY valid JSON.

{
  "sentiment": "Positive",
  "clarityScore": 85,
  "energyLevel": "Balanced",
  "keyThemes": ["Progress", "Focus", "Confidence"]
}

Rules:

- sentiment must be Positive, Reflective, Constructive, Challenged, or Optimistic
- clarityScore must be a number between 1 and 100
- energyLevel must be High, Balanced, Calm, or Depleted
- keyThemes must contain 1-3 short themes
- Do not include markdown
- Do not include explanations outside the JSON
`;

    try {
      const result =
        await generateContentWithFallback({
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
        });

      const rawJson = cleanJsonResponse(result.text);
      const sentimentData = JSON.parse(rawJson);

      const clarityScore = Number(
        sentimentData.clarityScore
      );

      const validSentiments = [
        "Positive",
        "Reflective",
        "Constructive",
        "Challenged",
        "Optimistic",
      ];

      const validEnergyLevels = [
        "High",
        "Balanced",
        "Calm",
        "Depleted",
      ];

      if (
        !validSentiments.includes(
          sentimentData.sentiment
        ) ||
        !Number.isFinite(clarityScore) ||
        clarityScore < 1 ||
        clarityScore > 100 ||
        !validEnergyLevels.includes(
          sentimentData.energyLevel
        ) ||
        !Array.isArray(
          sentimentData.keyThemes
        )
      ) {
        throw new Error(
          "Invalid sentiment data."
        );
      }

      const keyThemes = sentimentData.keyThemes
        .filter(
          (theme) =>
            typeof theme === "string" &&
            theme.trim()
        )
        .map((theme) => theme.trim())
        .slice(0, 3);

      if (keyThemes.length === 0) {
        throw new Error(
          "No valid themes returned."
        );
      }

      return res.status(200).json({
        sentiment:
          sentimentData.sentiment,
        clarityScore,
        energyLevel:
          sentimentData.energyLevel,
        keyThemes,
        model: result.modelUsed,
        simulated: result.simulated || false,
      });
    } catch (error) {
      console.warn(
        "[Sentiment Analysis] Using fallback."
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
        model: "AI Reflection Fallback",
        simulated: true,
      });
    }
  } catch (error) {
    console.error(
      "[Sentiment Controller] Analysis failed:",
      error
    );

    return res.status(500).json({
      error: "Analysis Failed",
      message:
        "Unable to analyze reflection.",
    });
  }
}

/* Remove markdown formatting from Gemini JSON responses */
function cleanJsonResponse(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty AI response.");
  }

  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  const firstArray = cleaned.indexOf("[");
  const lastArray = cleaned.lastIndexOf("]");

  if (
    firstArray !== -1 &&
    lastArray !== -1 &&
    (firstObject === -1 ||
      firstArray < firstObject)
  ) {
    cleaned = cleaned.substring(
      firstArray,
      lastArray + 1
    );
  } else if (
    firstObject !== -1 &&
    lastObject !== -1
  ) {
    cleaned = cleaned.substring(
      firstObject,
      lastObject + 1
    );
  }

  return cleaned;
}

export {
  synthesizeActionsController,
  analyzeSentimentController,
};
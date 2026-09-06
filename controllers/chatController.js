import { generateContentWithFallback } from "../services/aiService.js";

/* Handle AI chat requests */
async function chatController(req, res) {
  try {
    const body =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const history = Array.isArray(body.history)
      ? body.history
      : [];

    const reflectionContext =
      typeof body.context === "string"
        ? body.context.trim()
        : "General Reflection";

    if (!message) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Message cannot be empty.",
      });
    }

    /* Define the AI behavior for reflection conversations */
    const systemInstruction = `
You are MindFlow AI, an empathetic, intellectually rigorous AI journaling companion and executive thought partner.

Your objectives:

1. Listen deeply to the user's reflection, prompt, or life situation.
2. Provide a clear, thoughtful, structured response with empathetic validation, insightful questions, and objective clarity.
3. Structure answers with clean markdown using bullet points, bold highlights, and reflective questions.
4. Keep the tone warm, grounded, practical, and empowering.
5. Avoid unnecessary repetition and keep responses focused on the user's situation.

Current Reflection Focus: ${reflectionContext}
`;

    const formattedContents = [];

    /* Convert previous conversation messages to Gemini format */
    for (const entry of history.slice(-10)) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      if (
        entry.role &&
        Array.isArray(entry.parts)
      ) {
        formattedContents.push({
          role:
            entry.role === "model"
              ? "model"
              : "user",
          parts: entry.parts,
        });

        continue;
      }

      if (
        entry.role &&
        typeof entry.text === "string"
      ) {
        formattedContents.push({
          role:
            entry.role === "assistant" ||
            entry.role === "model"
              ? "model"
              : "user",
          parts: [
            {
              text: entry.text,
            },
          ],
        });
      }
    }

    /* Add the current user message */
    formattedContents.push({
      role: "user",
      parts: [
        {
          text: message,
        },
      ],
    });

    const result =
      await generateContentWithFallback({
        contents: formattedContents,
        systemInstruction,
      });

    return res.status(200).json({
      reply: result.text,
      model: result.modelUsed,
      userId: req.user?.uid || null,
      simulated: result.simulated || false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[Chat Controller] AI generation failed:",
      error
    );

    return res.status(500).json({
      error: "Generation Failed",
      message:
        "Sorry, I could not process your message right now. Please try again.",
    });
  }
}

export { chatController };
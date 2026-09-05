import { generateContentWithFallback } from "../services/aiService.js";

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
        ? body.context
        : "General Reflection";

    const clientKey =
      req.headers["x-gemini-api-key"] || null;

    if (!message) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Message cannot be empty.",
      });
    }

    const systemInstruction = `
You are MindFlow AI, an empathetic, intellectually rigorous AI journaling companion and executive thought partner.

Your objectives:
1. Listen deeply to the user's reflection, prompt, or life situation.
2. Provide a clear, thoughtful, structured response with empathetic validation, insightful questions, and objective clarity.
3. Structure answers with clean markdown (bullet points, bold highlights, reflective questions).
4. Keep tone warm, grounded, and empowering.

Current Reflection Focus: ${reflectionContext}
`;

    const formattedContents = [];

    for (const entry of history.slice(-10)) {
      if (entry.role && entry.parts) {
        formattedContents.push(entry);
      } else if (entry.role && entry.text) {
        formattedContents.push({
          role:
            entry.role === "assistant" ||
            entry.role === "model"
              ? "model"
              : "user",
          parts: [
            {
              text: String(entry.text),
            },
          ],
        });
      }
    }

    formattedContents.push({
      role: "user",
      parts: [
        {
          text: message,
        },
      ],
    });

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction,
      temperature: 0.7,
      requestKey: clientKey,
    });

    return res.status(200).json({
      reply: result.text,
      model: result.modelUsed,
      userId: req.user.uid,
      simulated: result.simulated || false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Chat Controller Error]:", error);

    return res.status(500).json({
      error: "Generation Failed",
      message:
        error.message ||
        "An unexpected error occurred during content generation.",
    });
  }
}

export { chatController };
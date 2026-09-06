function healthController(req, res) {
  return res.status(200).json({
    status: "healthy",
    service: "mindflow-ai",
    timestamp: new Date().toISOString(),
    cloudRunLabel:
      "dev-tutorial=cloud-run-ai-challenge",
  });
}

/* Provide Firebase client configuration to the frontend */
function configController(req, res) {
  return res.status(200).json({
    firebaseConfig: {
      apiKey:
        process.env.FIREBASE_API_KEY || "",
      authDomain:
        process.env.FIREBASE_AUTH_DOMAIN || "",
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCP_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        "",
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId:
        process.env.FIREBASE_MESSAGING_SENDER_ID ||
        "",
      appId:
        process.env.FIREBASE_APP_ID || "",
    },

    appInfo: {
      title: "MindFlow AI",
      challengeTrack: "Ideathon Challenge",
      serverAiConfigured: Boolean(
        process.env.GEMINI_API_KEY ||
          process.env.GEMINI_SECRET_NAME
      ),
    },
  });
}

export {
  healthController,
  configController,
};
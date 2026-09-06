import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const secretManagerClient =
  new SecretManagerServiceClient();

let cachedGeminiApiKey = null;

/* Get the Google Cloud project ID */
function getProjectId() {
  return (
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    ""
  ).trim();
}

/* Get the Gemini Secret Manager secret name */
function getSecretName() {
  return (
    process.env.GEMINI_SECRET_NAME ||
    "gemini-api-key"
  ).trim();
}

/* Get the Gemini API key securely */
async function getGeminiApiKey() {
  if (cachedGeminiApiKey) {
    return cachedGeminiApiKey;
  }

  const environmentApiKey =
    process.env.GEMINI_API_KEY?.trim();

  if (environmentApiKey) {
    cachedGeminiApiKey = environmentApiKey;
    return cachedGeminiApiKey;
  }

  const projectId = getProjectId();
  const secretName = getSecretName();

  if (!projectId) {
    console.warn(
      "[Secret Manager] Google Cloud project ID is unavailable."
    );

    return null;
  }

  try {
    const [version] =
      await secretManagerClient.accessSecretVersion({
        name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
      });

    const secret =
      version?.payload?.data
        ?.toString("utf8")
        ?.trim();

    if (!secret) {
      console.warn(
        "[Secret Manager] Gemini API key is empty."
      );

      return null;
    }

    cachedGeminiApiKey = secret;

    console.log(
      "[Secret Manager] Gemini API key loaded successfully."
    );

    return cachedGeminiApiKey;
  } catch (error) {
    console.warn(
      "[Secret Manager] Could not load Gemini API key."
    );

    return null;
  }
}

export {
  getGeminiApiKey,
};

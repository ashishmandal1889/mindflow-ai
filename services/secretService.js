import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let cachedApiKey = process.env.GEMINI_API_KEY || null;

async function getGeminiApiKey(requestHeaderKey = null) {
  // 1. Optional key supplied by request
  // Kept temporarily for local compatibility.
  if (
    requestHeaderKey &&
    typeof requestHeaderKey === "string" &&
    requestHeaderKey.trim().length > 10
  ) {
    return requestHeaderKey.trim();
  }

  // 2. Cached API key
  if (cachedApiKey && cachedApiKey.length > 5) {
    return cachedApiKey;
  }

  // 3. Google Cloud Secret Manager
  const projectId =
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;

  const secretName =
    process.env.GEMINI_SECRET_NAME ||
    "GEMINI_API_KEY";

  if (projectId) {
    try {
      console.log(
        `[SecretManager] Accessing secret '${secretName}' in project '${projectId}'...`
      );

      const client = new SecretManagerServiceClient();

      const [version] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
      });

      const secretPayload =
        version.payload?.data?.toString("utf8");

      if (secretPayload) {
        cachedApiKey = secretPayload.trim();

        console.log(
          "[SecretManager] Secret successfully retrieved and cached."
        );

        return cachedApiKey;
      }
    } catch (err) {
      console.warn(
        `[SecretManager] Could not read secret: ${err.message}`
      );
    }
  }

  // 4. Final environment-variable fallback
  if (process.env.GEMINI_API_KEY) {
    cachedApiKey = process.env.GEMINI_API_KEY.trim();
    return cachedApiKey;
  }

  return null;
}

export { getGeminiApiKey };
# 🌟 Gemini LifePulse: Intelligent Reflective Studio on Cloud Run

[![Google Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Firebase Auth](https://img.shields.io/badge/Auth-Firebase%20Google%20Sign--In-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Firestore Isolated](https://img.shields.io/badge/Database-Firestore%20User--Isolated-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini 3.6 Flash](https://img.shields.io/badge/AI-Gemini%203.6%20Flash%20%2B%20Ladder-9B72CF?logo=google&logoColor=white)](https://aistudio.google.com)
[![Verification Label](https://img.shields.io/badge/dev--tutorial-cloud--run--ai--challenge-green)](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge)

> **Ideathon Challenge Prototype Submission**: A production-ready, user-authenticated AI journaling & reflection application deployed on **Google Cloud Run**, leveraging **Firebase Authentication**, **Cloud Firestore** user-isolated storage, **Google Cloud Secret Manager**, and the **Gemini API** with an automated resilient model fallback ladder.

---

## 🚀 Key Features Beyond the Starter Lab

- 🔒 **Federated Identity & Zero Stored Passwords**: Secure single sign-on with Firebase Google Authentication.
- 📂 **Strict Multi-Tenant Database Isolation**: Every journal entry and interaction is locked to `/users/{userId}/interactions/{interactionId}` governed by zero-trust Firestore security rules.
- ⚡ **Resilient Gemini Fallback Ladder**: Automated failover across `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash` with smart error recovery for status codes 503, 429, 404, and 500.
- 🎯 **Automated SMART Action Item Synthesizer**: Parses unstructured reflective dialogue into structured, prioritized, actionable tasks.
- 📊 **Emotional Clarity & Sentiment Meter**: Real-time clarity scoring (1-100), emotional sentiment classification, and thematic tag extraction.
- 🎙️ **Voice Dictation**: Hands-free reflection using the browser's Web Speech API.
- 📄 **Export Studio**: Instant export to Markdown and Print-to-PDF.
- 🛡️ **Google Cloud Secret Manager Integration**: Dynamic operational API key retrieval with zero hardcoded credentials.

---

## 🛡️ Agentic Threat Modeling & Security Directives

| Threat Zone | Identified Risk | Architectural Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection or oversized payload | Strict JSON schema parsing, 5MB body limits, defensive null-safe destructuring |
| **Planning & Reasoning** | System instruction bypass / Prompt hijacking | Strict system directive boundaries; external inputs treated purely as passive data |
| **Tool Execution** | API credential compromise | Zero hardcoded keys; Secret Manager dynamic fetching via runtime service account IAM |
| **Memory & State** | Cross-tenant data leakage | Enforced Firestore Rules: `request.auth.uid == userId` for all path reads/writes |
| **Inter-System Comms** | Upstream Gemini service outages / rate limits | Resilient 5-tier model fallback ladder with exponential error recovery |

---

## 📦 Architecture Overview

```
Client (Browser)
   ├── Firebase Auth (Google Sign-In)
   ├── Direct Isolated Firestore Sync (/users/{uid}/interactions)
   └── Web Speech & Markdown Rendering
         │
         ▼ (HTTPS Bearer Token)
Cloud Run Backend Service (Containerized Express)
   ├── Firebase Admin SDK Token Verification
   ├── Google Cloud Secret Manager (GEMINI_API_KEY)
   └── Resilient Gemini Fallback Ladder (Google GenAI)
```

---

## ⚙️ Prerequisites & Google Cloud Setup

### 1. Enable Required Cloud APIs
```bash
gcloud services enable run.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    cloudbuild.googleapis.com
```

### 2. Store Gemini API Key in Google Cloud Secret Manager
```bash
# Create secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API key from Google AI Studio
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run runtime service account permission to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Secure Firestore Rules
Ensure Firestore is provisioned in **Native Mode**. Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```
Or paste into the Firebase Console &rarr; Firestore Database &rarr; Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Deploying to Google Cloud Run

### One-Command Deployment (Cloud Build + Cloud Run)
```bash
# Set your preferred region
REGION="us-central1"
SERVICE_NAME="gemini-lifepulse"

# Deploy directly from source
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=$(gcloud config get-value project),GEMINI_SECRET_NAME=GEMINI_API_KEY"
```

### 🏷️ Mandatory Challenge Verification Labeling
To register the deployment for the **Accelerate AI with Cloud Run Challenge**, update the service label:
```bash
gcloud run services update $SERVICE_NAME \
    --update-labels=dev-tutorial=cloud-run-ai-challenge \
    --region $REGION
```

Verify the label is attached:
```bash
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(metadata.labels)"
```

---

## 💻 Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` from Google AI Studio.

3. **Run Locally**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

---

## 🧪 Functional Test Cases & Stability Verification

1. **Unauthenticated Access**: Visiting the base URL shows the secure landing hero. Clicking "Sign In with Google" triggers the federated Google Sign-In popup without prompting for custom password creation.
2. **Multi-Turn Interaction**: Submit a reflection ("I have three high-priority deadlines this week and feel overwhelmed"). Gemini replies empathetically with structured prioritization. Continuing with "Help me break down the first deadline" preserves the conversational context.
3. **Database Isolation Test**: Log in as User A and create an entry. Log in as User B: User B cannot see or query User A's entries (`/users/{uidA}/interactions`).
4. **Resilient Fallback**: In the event of a 429 quota limit or 503 transient issue on `gemini-3.6-flash`, the backend seamlessly fails over to `gemini-3.1-flash-lite` without interrupting the user session.
5. **Action Synthesis**: Clicking "⚡ Synthesize" generates 2-4 concrete SMART action items extracted from the conversation.
6. **Export Verification**: Clicking "Export" generates a downloaded clean `.md` reflection file.

---

## 📄 License
Apache 2.0. Built for the Google Cloud Run AI Challenge.

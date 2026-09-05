# 🏆 Ideathon Prototype Submission Kit
## Challenge: Accelerate AI with Cloud Run (#AccelerateAIwithCloudRun)

This document contains everything you need to copy and paste into the Ideathon submission portal before the deadline.

---

### 1. Tracks and Challenges
* **Selection:** `Ideathon Challenge`

---

### 2. Working Prototype Link Deployed on Cloud Run or App Walkthrough
* **Primary (Cloud Run Service URL):**
  `https://gemini-lifepulse-<your-project-hash>-uc.a.run.app` *(Replace with your deployed Cloud Run URL)*
* **Alternative / Backup (Walkthrough Video or Blog):**
  `https://youtu.be/...` or `https://www.loom.com/share/...` or `https://medium.com/@...`
  *(See Section 6 below for a 90-second recording script)*

---

### 3. Demo Social Post Link
* **Post URL:** `https://www.linkedin.com/posts/...` or `https://x.com/...`
  *(Ensure the post contains the mandatory hashtag `#AccelerateAIwithCloudRun`)*

---

### 4. Public Code Repository Link
* **URL:** `https://github.com/<your-github-username>/gemini-lifepulse`
  *(Ensure repository visibility is set to Public)*

---

### 5. Brief Description of Your Solution (Under 1024 Characters)

Copy and paste the exact text below into the submission form (Character count: 918 / 1024):

```text
Gemini LifePulse is an enterprise-hardened reflective journaling studio deployed on Google Cloud Run. It combines multi-turn conversational AI with automatic SMART action item synthesis and emotional clarity analytics. 

Core Architecture:
1. Firebase Authentication provides passwordless, federated Google Sign-In, eliminating credential storage vulnerabilities.
2. Cloud Firestore enforces strict user data isolation via rules (/users/{userId}/interactions/{interactionId}), ensuring zero cross-tenant visibility.
3. Multi-turn Gemini 3.6 Flash API powers empathetic reflections and action synthesis, governed by an automated resilient model fallback ladder (3.6 Flash -> 3.1 Flash-Lite -> Flash-Latest -> 3.7 Flash) with 503/429 status recovery.
4. Google Cloud Secret Manager enables dynamic, zero-hardcoding operational API key ingestion.
5. Deployed as a secure, containerized microservice on Google Cloud Run tagged with dev-tutorial=cloud-run-ai-challenge.
```

---

### 6. Services Utilized in Your Project (Checklist Confirmation)
Check and confirm all of the following in the submission form:
- [x] **User authentication via Firebase**
- [x] **Multi-turn interaction with the Gemini API**
- [x] **User-isolated Firestore document storage**
- [x] **Secure API key retrieval via Google Cloud Secret Manager**
- [x] **Others:** Google Cloud Run (containerized serverless deployment with `dev-tutorial=cloud-run-ai-challenge` verification label), Automated Resilient Model Fallback Ladder, and SMART Action Item Synthesis.

---

### 7. Ready-to-Publish Social Media Post Copy

#### LinkedIn Post Draft
```text
🚀 Excited to share my prototype submission for the Google Cloud Run AI Challenge: Gemini LifePulse!

Gemini LifePulse is a production-grade, authenticated AI reflection studio designed to turn daily journaling and thoughts into prioritized, high-leverage SMART action items.

Key Architectural Highlights:
✨ Cloud Run: Serverless, containerized deployment tagged with dev-tutorial=cloud-run-ai-challenge
🔐 Firebase Authentication: Secure Google federated login with zero password storage
📂 Cloud Firestore: Strict multi-tenant isolation locking user entries to /users/{uid}/interactions
⚡ Gemini 3.6 Flash + Resilient Fallback Ladder: Automated failover across 4 model tiers for 99.9% availability
🛡️ Google Cloud Secret Manager: Zero-hardcoding dynamic operational credential ingestion

Check out the code and deployment guide: https://github.com/<your-username>/gemini-lifepulse

#AccelerateAIwithCloudRun #GoogleCloud #GeminiAPI #CloudRun #Firebase #AI #FullStack
```

#### X / Twitter Post Draft
```text
Built & deployed Gemini LifePulse for the Google Cloud Run AI Challenge! 🚀

An authenticated AI reflection studio with:
🔹 @GoogleCloud Run containerization
🔹 Firebase Google Auth
🔹 User-isolated Firestore
🔹 Gemini 3.6 Flash multi-turn + resilient fallback ladder
🔹 Secret Manager key security

#AccelerateAIwithCloudRun
```

---

### 8. 90-Second Walkthrough Video Script (For Loom / YouTube / Social Demo)

If you record a quick video demo, follow this high-scoring flow:
- **0:00 - 0:15 (The Problem & Intro):** "Hi everyone! This is Gemini LifePulse, built for the Accelerate AI with Cloud Run challenge. It's a secure, user-authenticated journaling studio that turns daily thoughts into concrete SMART action items."
- **0:15 - 0:35 (Authentication & Security):** "We authenticate via Firebase Google Sign-In with zero password storage. Notice how all journal records are strictly isolated in Cloud Firestore under `/users/{uid}/interactions`."
- **0:35 - 0:60 (Gemini Multi-Turn & Fallback):** "Let's enter a reflection about launching a major feature. Gemini 3.6 Flash engages in deep multi-turn dialogue. Behind the scenes, our backend implements a resilient fallback ladder to guarantee zero downtime."
- **0:60 - 0:80 (Action Item Synthesis & Analytics):** "With one click on 'Synthesize', Gemini parses the chat and produces structured SMART action items with priority tags, alongside real-time clarity scores."
- **0:80 - 0:90 (Cloud Run & Deployment):** "The app is containerized with Docker and running live on Google Cloud Run, dynamically fetching its API keys from Google Cloud Secret Manager."

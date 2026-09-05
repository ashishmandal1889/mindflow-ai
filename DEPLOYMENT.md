# 🚀 5-Minute Google Cloud Run & GitHub Deployment Guide

Follow these quick steps to push your project to GitHub and deploy it live to Google Cloud Run with the required challenge verification label.

---

## Part 1: Push to Public GitHub Repository (2 minutes)

1. Open your terminal in the project directory:
   ```bash
   cd C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse
   ```

2. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Gemini LifePulse prototype with Cloud Run & Firebase"
   ```

3. Create a public repository on GitHub (e.g., `gemini-lifepulse`):
   - Go to [https://github.com/new](https://github.com/new)
   - Repository name: `gemini-lifepulse`
   - Visibility: **Public** (Mandatory for challenge)
   - Click **Create repository**

4. Link and push:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/gemini-lifepulse.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Deploy to Google Cloud Run via Google Cloud Shell (3 minutes)

The easiest and fastest way to deploy without installing gcloud locally is using **Google Cloud Shell** (built into Google Cloud Console):

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Click the **Activate Cloud Shell** icon (top right `>_`).
3. In Cloud Shell, clone your new GitHub repo:
   ```bash
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/gemini-lifepulse.git
   cd gemini-lifepulse
   ```

4. Enable the necessary APIs:
   ```bash
   gcloud services enable run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com
   ```

5. Store your Gemini API Key in Secret Manager:
   ```bash
   # Create the secret
   gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

   # Store your API key (paste when prompted or pipe)
   echo -n "YOUR_AI_STUDIO_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

   # Grant Cloud Run service account permission to read the secret
   PROJECT_ID=$(gcloud config get-value project)
   PROJECT_NUM=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
       --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   ```

6. Deploy to Cloud Run:
   ```bash
   gcloud run deploy gemini-lifepulse \
       --source . \
       --region us-central1 \
       --allow-unauthenticated \
       --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},GEMINI_SECRET_NAME=GEMINI_API_KEY"
   ```

7. **Attach the Mandatory Challenge Label**:
   ```bash
   gcloud run services update gemini-lifepulse \
       --update-labels=dev-tutorial=cloud-run-ai-challenge \
       --region us-central1
   ```

8. Copy the live URL displayed in your terminal (e.g. `https://gemini-lifepulse-xxxx-uc.a.run.app`) and paste it into your Ideathon submission form!

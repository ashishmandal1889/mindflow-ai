# 🚀 MindFlow AI — Google Cloud Run & GitHub Deployment Guide

This guide deploys the current **MindFlow AI** application from GitHub to Google Cloud Run and applies the required challenge verification label.

> **Important:** Your existing Render deployment should remain untouched. Use Cloud Run as the challenge deployment. Do not delete the working Render service.

---

## Part 1 — Push MindFlow AI to GitHub

Open a terminal in your project:

```bash
cd C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse
```

Check the existing Git configuration:

```bash
git status
git remote -v
```

Your current repository is:

```text
https://github.com/ashishmandal1889/mindflow-ai
```

If the repository is already connected, **do not run `git init` or `git remote add origin` again.**

Commit the latest changes:

```bash
git add .
git commit -m "chore: finalize MindFlow AI branding"
git push origin main
```

---

# Part 2 — Open Google Cloud Shell

Open:

https://console.cloud.google.com

Make sure the selected Google Cloud project is:

```text
mindflow-ai-6d4bf
```

Then click **Activate Cloud Shell**.

Cloud Shell already includes the Google Cloud CLI, so you don't need to install `gcloud` locally. citeturn0search12

---

# Part 3 — Clone the GitHub Repository

In Cloud Shell:

```bash
git clone https://github.com/ashishmandal1889/mindflow-ai.git
cd mindflow-ai
```

Verify:

```bash
ls
```

You should see files such as:

```text
server.js
package.json
Dockerfile
public/
```

---

# Part 4 — Set the Google Cloud Project

Run:

```bash
gcloud config set project mindflow-ai-6d4bf
```

Verify:

```bash
gcloud config get-value project
```

It should return:

```text
mindflow-ai-6d4bf
```

---

# Part 5 — Enable Required Google Cloud APIs

Run:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

Cloud Run can deploy directly from source using `gcloud run deploy --source .`; when a Dockerfile is present, the source deployment can use it as part of the build process. citeturn0search3

---

# Part 6 — Create the Gemini API Secret

Do **not** put your Gemini API key in GitHub.

Create the Secret Manager secret:

```bash
gcloud secrets create GEMINI_API_KEY \
  --replication-policy="automatic"
```

Then add the API key as a secret version:

```bash
echo -n "YOUR_GEMINI_API_KEY" | \
gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Replace:

```text
YOUR_GEMINI_API_KEY
```

with your actual Google AI Studio API key.

**Never commit this key to GitHub or put it directly into your source code.**

---

# Part 7 — Allow Cloud Run to Read the Secret

Get the project number:

```bash
PROJECT_ID=$(gcloud config get-value project)

PROJECT_NUM=$(gcloud projects describe "$PROJECT_ID" \
  --format="value(projectNumber)")
```

Grant the Cloud Run runtime service account access:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

# Part 8 — Deploy MindFlow AI to Cloud Run

Deploy using the current application name:

```bash
gcloud run deploy mindflow-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-labels="dev-tutorial=cloud-run-ai-challenge"
```

Cloud Run supports configuring secrets as environment variables, and labels can be supplied during deployment. citeturn0search0turn0search10

When prompted:

```text
Allow unauthenticated invocations?
```

choose:

```text
y
```

If Cloud Run asks to enable additional APIs, choose:

```text
y
```

Wait for the deployment to finish.

---

# Part 9 — Verify the Challenge Label

Run:

```bash
gcloud run services describe mindflow-ai \
  --region us-central1 \
  --format="yaml(metadata.labels)"
```

You should see:

```yaml
dev-tutorial: cloud-run-ai-challenge
```

Cloud Run officially supports `--update-labels` for adding or updating service labels. citeturn0search0

---

# Part 10 — Get the Cloud Run URL

Run:

```bash
gcloud run services describe mindflow-ai \
  --region us-central1 \
  --format="value(status.url)"
```

You'll receive a URL similar to:

```text
https://mindflow-ai-xxxxxxxxxx-uc.a.run.app
```

Open that URL in your browser.

---

# Part 11 — Test the Cloud Run Deployment

Test these features:

### Authentication

- Google Sign-In works
- User reaches the MindFlow dashboard

### Reflection

- Create a new reflection
- Send multiple messages
- AI responds correctly

### History

- Reflection appears in the sidebar
- Refresh the page
- Reflection remains available

### Delete

- Delete a reflection
- Confirm it disappears

### Firebase

- User data remains isolated to the authenticated user

---

# Part 12 — Firebase Authorized Domain

Once you have the Cloud Run URL, add its hostname to:

**Firebase Console → Authentication → Settings → Authorized domains**

For example:

```text
mindflow-ai-xxxxxxxxxx-uc.a.run.app
```

Keep your existing domains:

```text
localhost
mindflow-ai-6d4bf.firebaseapp.com
mindflow-ai-6d4bf.web.app
mindflow-ai-9fho.onrender.com
```

---

# ⚠️ Important: Render vs Cloud Run

Your architecture will now be:

```text
                    ┌─────────────────┐
                    │     GitHub      │
                    │   mindflow-ai   │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
        ┌────────────────┐      ┌────────────────┐
        │     Render     │      │   Cloud Run    │
        │  Working Demo  │      │   Challenge    │
        └────────────────┘      └───────┬────────┘
                                        │
                             ┌──────────┴──────────┐
                             │                     │
                             ▼                     ▼
                       Firebase Auth        Gemini API
                       + Firestore
```

**Do not delete Render.**

Render remains your working backup/demo deployment.

Cloud Run becomes the deployment you submit for the challenge.

---

# 🎯 Final Challenge Requirements

Before submitting, verify:

- [ ] GitHub repository is public if the challenge requires public visibility
- [ ] Latest MindFlow AI code is pushed
- [ ] Cloud Run service is named `mindflow-ai`
- [ ] Cloud Run deployment is live
- [ ] Google Sign-In works
- [ ] AI reflection works
- [ ] Multiple chat messages work
- [ ] Firestore history works
- [ ] Delete reflection works
- [ ] Challenge label exists:

```text
dev-tutorial=cloud-run-ai-challenge
```

- [ ] Cloud Run URL is copied into the Ideathon submission form

## Final submission URL

Use the URL returned by:

```bash
gcloud run services describe mindflow-ai \
  --region us-central1 \
  --format="value(status.url)"
```
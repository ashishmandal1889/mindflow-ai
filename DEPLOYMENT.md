MindFlow AI

GitHub & Render Deployment Guide

Professional deployment, configuration, testing, and submission reference

This guide documents the current deployment workflow for MindFlow AI, including GitHub source control, Render hosting, Firebase Authentication and Firestore, Gemini AI, and optional Google Cloud Secret Manager integration. The existing Render deployment is the primary live demo and should remain active.

1. Project Information

Component

Configuration

GitHub Repository

https://github.com/ashishmandal1889/mindflow-ai

Local Project

C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse

Live Render URL

https://mindflow-ai-9fho.onrender.com

Google Cloud Project

mindflow-ai-6d4bf

Authentication

Google Sign-In

Database

Firebase Firestore

AI Model

gemini-3.5-flash-lite

Hosting

Render

2. Application Architecture

                         GitHub
                           |
                           v
                         Render
                           |
                           v
                      MindFlow AI
                           |
              +------------+------------+
              |            |            |
              v            v            v
          Firebase       Gemini       Express
        Auth + Firestore   AI API      Backend

Technology Stack

Node.js

Express

Firebase Authentication

Firebase Firestore

Gemini API

Google Cloud Secret Manager

Docker

HTML

CSS

JavaScript

Authentication: Google Sign-In only. Email/Password authentication has been removed from the application interface.

3. GitHub Deployment

3.1 Open the Project

cd C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse

3.2 Check Git Status

git status

3.3 Verify the GitHub Remote

git remote -v

The repository should point to:

https://github.com/ashishmandal1889/mindflow-ai

If the repository is already connected, do not run:

git init

git remote add origin ...

3.4 Commit and Push Changes

git add .

git commit -m "chore: finalize MindFlow AI"

git push origin main

If Git reports that the remote contains newer commits:

git pull --rebase origin main

git push origin main

4. GitHub Repository Verification

Open the repository:

https://github.com/ashishmandal1889/mindflow-ai

Verify that the latest project files are present.

server.js

package.json

Dockerfile

.env.example

public/

controllers/

models/

routes/

services/

config/

The following must never be committed:

.env

Firebase service account credentials

Gemini API keys

Private credentials

5. Render Deployment

5.1 Existing Render Service

Use the existing MindFlow AI Render service. Do not delete the existing deployment.

GitHub
   |
   v
main branch
   |
   v
Render
   |
   v
MindFlow AI

Current live deployment:

https://mindflow-ai-9fho.onrender.com

5.2 Repository Configuration

The Render service should be connected to:

ashishmandal1889/mindflow-ai

Deployment branch:

main

6. Render Build Configuration

The project contains a package.json with the following start command:

npm start

The application starts with:

node server.js

The server uses the PORT environment variable provided by Render.

The repository also contains a Dockerfile. It can be used when the Render service is configured for Docker deployment.

7. Render Environment Variables

Open:

Render Dashboard → MindFlow AI Service → Environment

Configure the required environment variables.

NODE_ENV=production

GCP_PROJECT_ID=mindflow-ai-6d4bf

GEMINI_SECRET_NAME=gemini-api-key

If the Gemini API key is supplied directly through Render:

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

Replace YOUR_GEMINI_API_KEY with the actual key. Never commit the actual key to GitHub.

8. Firebase Configuration

Configure the Firebase web application values required by the current project.

FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID

Use the Firebase project associated with:

mindflow-ai-6d4bf

Do not commit private Firebase server credentials.

9. Firebase Authentication

Open:

Firebase Console → Authentication → Sign-in method

Verify that Google is enabled.

Landing Page
      |
      v
Google Sign-In
      |
      v
Firebase Authentication
      |
      v
MindFlow Dashboard

Email/Password authentication is not part of the current application UI.

10. Firebase Authorized Domains

Open:

Firebase Console → Authentication → Settings → Authorized domains

Ensure the Render hostname is authorized:

mindflow-ai-9fho.onrender.com

Keep other required Firebase domains, such as:

mindflow-ai-6d4bf.firebaseapp.com
mindflow-ai-6d4bf.web.app
localhost

11. Firestore

MindFlow AI uses Firebase Firestore to store authenticated user interaction history.

users
└── userId
    └── interactions
        └── sessionId

Each authenticated user should access only their own data. Firestore rules are based on the authenticated Firebase UID.

12. Gemini AI

The current MindFlow AI application uses:

gemini-3.5-flash-lite

Gemini is used for:

AI reflection responses

Conversation assistance

Sentiment analysis

Reflection analysis

SMART action generation

Do not hard-code the API key into application source code.

13. Google Cloud Secret Manager

Google Cloud Secret Manager can be used to securely store the Gemini API key.

GCP_PROJECT_ID=mindflow-ai-6d4bf
GEMINI_SECRET_NAME=gemini-api-key

Corresponding secret:

gemini-api-key

If the Gemini key is configured directly in Render using GEMINI_API_KEY, add it securely through the Render environment settings. Do not expose the key through frontend code.

14. Deploy Latest Changes on Render

After pushing the latest code to GitHub:

GitHub
   |
   v
main branch
   |
   v
Render

If automatic deployment is enabled, Render should detect the new commit.

If automatic deployment is disabled:

Render Dashboard → MindFlow AI → Manual Deploy → Deploy latest commit

Wait until the deployment completes successfully.

15. Check Render Logs

Open:

Render Dashboard → MindFlow AI → Logs

Verify that the application starts successfully and that there is no startup crash. If the service fails, check Render environment variables, dependencies, Firebase configuration, Gemini configuration, and deployment logs.

16. Open the Live Application

https://mindflow-ai-9fho.onrender.com

The MindFlow AI landing page should load successfully.

17. Test Google Sign-In

Click Sign In or Get Started and use Google Sign-In.

Landing Page
      |
      v
Google Sign-In
      |
      v
Authentication
      |
      v
MindFlow Dashboard

18. Test AI Reflection

Create a new reflection. Example:

I had a productive day but I struggled to stay focused.

Click Send. The frontend sends the request to:

/api/chat

Gemini should return an AI response.

19. Test Multiple Messages

I completed my project today.

But I was distracted for most of the afternoon.

What should I improve tomorrow?

The AI should maintain the conversation context.

20. Test Reflection Analysis

Verify that the application can provide relevant analysis, including:

Sentiment

Emotional analysis

Patterns

Insights

21. Test SMART Actions

Reflection
    |
    v
AI Analysis
    |
    v
SMART Actions
    |
    v
Action Items

Generated actions should be practical and relevant to the reflection.

22. Test Conversation History

Create conversation
      |
      v
Send messages
      |
      v
Refresh browser
      |
      v
Google user remains authenticated
      |
      v
Previous conversation appears

23. Test Delete

Delete
   |
   v
Confirmation
   |
   v
Conversation removed

Refresh the page and verify that the deleted conversation does not return.

24. Test Mobile UI

Google Sign-In

Sidebar

New Reflection

Quick Prompts

Message Input

Send Button

AI Response

History

Delete

Verify that the mobile sidebar, message input, Send button, AI responses, history, and delete functionality work correctly. The Send button should remain completely visible above the browser viewport edge.

25. Verify Backend Health

https://mindflow-ai-9fho.onrender.com/health

The endpoint should return a successful response indicating that the server is running.

26. Verify Public Configuration

/api/config

This endpoint should expose only configuration that is safe for the frontend. Private credentials and API keys must never be returned.

27. Production/Demo Architecture

                         GitHub
                           |
                           v
                         Render
                           |
                           v
                      MindFlow AI
                           |
              +------------+------------+
              |            |            |
              v            v            v
          Firebase      Gemini API    Express
       Authentication                  Backend
              |
              v
           Firestore
              |
              v
       User Interactions

28. Deployment Responsibilities

Service

Responsibility

GitHub

Source code, version control, project repository, collaboration, deployment source

Render

Live application hosting, demo deployment, automatic deployment from GitHub

Firebase

Google Authentication, Firestore, user interaction data

Gemini

AI responses, reflection analysis, sentiment analysis, SMART action generation

Google Cloud Secret Manager

Secure Gemini API key storage when enabled

29. Security Guidelines

Never commit:

.env

Firebase service account JSON

Gemini API keys

Never place private credentials directly inside:

server.js
services/
controllers/
public/

Do not expose private API keys through frontend JavaScript or public API responses.

If an API key is accidentally committed to GitHub, revoke it, create a new key, update the Render environment variable, and remove the exposed secret from repository history if necessary.

30. Final GitHub Checklist

[ ] Latest code is pushed to GitHub

[ ] Repository is accessible

[ ] main branch contains the latest changes

[ ] .env is not committed

[ ] API keys are not committed

[ ] Firebase private credentials are not committed

[ ] Google Sign-In is enabled

[ ] Email/Password UI is removed

31. Final Render Checklist

[ ] Render service is running

[ ] Latest GitHub commit is deployed

[ ] Environment variables are configured

[ ] Firebase configuration works

[ ] Google Sign-In works

[ ] Gemini API works

[ ] AI chat works

[ ] Multiple messages work

[ ] Reflection analysis works

[ ] SMART actions work

[ ] Firestore history works

[ ] Delete works

[ ] Mobile UI works

[ ] Mobile Send button is fully visible

[ ] /health endpoint works

[ ] /api/config does not expose private credentials

32. Current Live URL

https://mindflow-ai-9fho.onrender.com

Use this URL for live demonstration, testing, presentation, and submission when Render is accepted by the challenge.

33. Challenge Submission

Before submitting, verify the exact deployment requirements of the challenge.

If the challenge requires a working web application, GitHub repository, and live deployment, the current Render deployment can be used.

If the challenge specifically requires Google Cloud Run or the label dev-tutorial=cloud-run-ai-challenge, Render alone does not satisfy that Cloud Run-specific requirement. Cloud Run would need to be deployed separately when the Google Cloud project has the required billing configuration.

Do not delete the working Render deployment.

34. Final Project Status

Item

Current Configuration

GitHub

https://github.com/ashishmandal1889/mindflow-ai

Hosting

Render

Live URL

https://mindflow-ai-9fho.onrender.com

Google Cloud Project

mindflow-ai-6d4bf

Authentication

Google Sign-In

Database

Firestore

AI Model

gemini-3.5-flash-lite

Backend

Node.js + Express

Secret Management

Google Cloud Secret Manager or Render Environment Variables

Containerization

Docker

35. Recommended Final Setup

                         GitHub
                           |
                           v
                         Render
                           |
                           v
                      MindFlow AI
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
        Google Sign-In  Gemini AI    Firestore
             |             |             |
             +-------------+-------------+
                           |
                           v
                  Reflection + SMART
                       Actions

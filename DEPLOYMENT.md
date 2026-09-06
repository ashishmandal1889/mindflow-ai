MindFlow AI — GitHub & Render Deployment Guide
This guide explains how to push the current MindFlow AI application to GitHub and deploy it on Render.
The existing Render deployment should remain active as the main working demo.
Part 1 — Project Information
GitHub Repository
https://github.com/ashishmandal1889/mindflow-ai
Local Project
C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse
Live Render Deployment
https://mindflow-ai-9fho.onrender.com/
Google Cloud Project
mindflow-ai-6d4bf
Part 2 — Application Architecture
                    GitHub
                      │
                      ▼
                   Render
                      │
                      ▼
               MindFlow AI
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       Firebase     Gemini      Express
       Auth +       AI API      Backend
       Firestore
The application uses:
Node.js
Express
Firebase Authentication
Firestore
Gemini API
Google Cloud Secret Manager
Docker
HTML
CSS
JavaScript
Authentication:
Google Sign-In only
Email/Password authentication has been removed from the application.
Part 3 — Push Latest Code to GitHub
Open PowerShell:
cd C:\Users\ashis\.gemini\antigravity\scratch\gemini-lifepulse
Check Git status:
git status
Check the repository:
git remote -v
You should see:
https://github.com/ashishmandal1889/mindflow-ai
If the repository is already connected, do not run:
git init
and do not run:
git remote add origin ...
Add the latest changes:
git add .
Commit:
git commit -m "chore: finalize MindFlow AI"
Push:
git push origin main
If Git reports that the remote contains newer changes, run:
git pull --rebase origin main
Then:
git push origin main
Part 4 — Verify GitHub
Open the repository:
https://github.com/ashishmandal1889/mindflow-ai
Make sure the latest project files are visible.
Important files include:
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
Make sure you have not committed:
.env
or any actual API keys.
Part 5 — Render Deployment
Open the Render dashboard.
Use the existing MindFlow AI web service.
Do not create a second service unless necessary.
Your Render service should be connected to:
GitHub
↓
ashishmandal1889/mindflow-ai
Render should deploy the main branch.
Part 6 — Render Build Configuration
Use the Node.js application configuration from the repository.
The project contains:
package.json
with:
npm start
as the start command.
The application starts using:
node server.js
The server uses the Render-provided:
PORT
environment variable.
The Dockerfile is also available for container-based deployment if the Render service is configured to use Docker.
Part 7 — Render Environment Variables
Open:
Render Dashboard
→ MindFlow AI Service
→ Environment
Add the required environment variables.
At minimum, configure:
NODE_ENV=production
GCP_PROJECT_ID=mindflow-ai-6d4bf
GEMINI_SECRET_NAME=gemini-api-key
If you are using the Gemini API key directly on Render, configure:
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
Replace:
YOUR_GEMINI_API_KEY
with your actual Gemini API key.
Do not put the actual API key in GitHub.
Part 8 — Firebase Configuration
The frontend requires the Firebase web configuration.
Configure the Firebase values used by the application in Render according to your .env.example.
Typical Firebase configuration values include:
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
Use the values from your Firebase project:
mindflow-ai-6d4bf
Do not commit private server credentials to GitHub.
Part 9 — Firebase Authentication
Open:
Firebase Console
→ Authentication
→ Sign-in method
Make sure:
Google
is enabled.
The application currently uses:
Google Sign-In
Email/Password authentication is not part of the current MindFlow AI UI.
Part 10 — Firebase Authorized Domain
Open:
Firebase Console
→ Authentication
→ Settings
→ Authorized domains
Make sure the Render domain is authorized:
mindflow-ai-9fho.onrender.com
Keep the Firebase domains that are already required by your project.
For local development, you may also have:
localhost
Part 11 — Firestore
The application uses Firestore to store authenticated user interaction history.
The expected structure is:
users
 └── userId
      └── interactions
           └── sessionId
Each authenticated user should access only their own data.
The Firestore security rules are configured around the authenticated Firebase UID.
Part 12 — Gemini AI
MindFlow AI currently uses:
gemini-3.5-flash-lite
The Gemini API key should be supplied through the Render environment configuration or through the configured Secret Manager flow.
Do not hard-code the API key inside:
server.js
services/aiService.js
controllers/
public/
Do not commit the API key to GitHub.
Part 13 — Google Cloud Secret Manager
If your Render deployment is configured to retrieve the Gemini key from Google Cloud Secret Manager, make sure the application has:
GCP_PROJECT_ID=mindflow-ai-6d4bf
and:
GEMINI_SECRET_NAME=gemini-api-key
The Secret Manager secret should be:
gemini-api-key
If you instead use the Render environment variable:
GEMINI_API_KEY
make sure the value is configured directly in Render.
Use only one intended configuration path and avoid exposing the key in source code.
Part 14 — Deploy Latest Changes on Render
After pushing changes to GitHub:
GitHub
↓
main branch
↓
Render
Render should automatically detect the new commit if automatic deploys are enabled.
If it does not deploy automatically, open the Render service and select:
Manual Deploy
→ Deploy latest commit
Wait until the deployment finishes successfully.
Part 15 — Check Render Logs
Open:
Render Dashboard
→ MindFlow AI
→ Logs
Look for messages similar to:
MindFlow AI running on port ...
and:
Firebase Admin initialized
and:
AI Service configured
There should not be a startup crash.
If the service fails to start, check the Render environment variables first.
Part 16 — Open the Live Application
Open:
https://mindflow-ai-9fho.onrender.com
The MindFlow AI landing page should load.
Part 17 — Test Google Sign-In
Click:
Sign In
or:
Get Started
Use Google Sign-In.
Expected flow:
Landing Page
↓
Google Sign-In
↓
Authentication
↓
MindFlow Dashboard
After authentication, the user profile should appear in the application header.
Part 18 — Test AI Reflection
Create a new reflection.
For example:
I had a productive day but I struggled to stay focused.
Click:
Send
The application should send the message to:
/api/chat
Gemini should generate an AI response.
Part 19 — Test Multiple Messages
Send several messages in the same conversation.
Example:
I completed my project today.
Then:
But I was distracted for most of the afternoon.
Then:
What should I improve tomorrow?
The AI should maintain the conversation context.
Part 20 — Test Reflection Analysis
Use the analysis functionality.
The application should be able to analyze the reflection and provide relevant insights such as:
Sentiment
Emotional analysis
Patterns
Insights
The backend uses the analysis endpoints configured in the application.
Part 21 — Test SMART Actions
Use the action synthesis feature.
The application should generate practical action items based on the user's reflection.
The expected flow is:
Reflection
↓
AI Analysis
↓
SMART Actions
↓
Action Items
Part 22 — Test Conversation History
Create a conversation.
Send several messages.
Then refresh the browser.
Expected:
Refresh
↓
Google user remains authenticated
↓
Previous conversation appears
↓
Conversation can be opened again
Part 23 — Test Delete
Select a conversation from the sidebar.
Delete it.
Expected:
Delete
↓
Confirmation
↓
Conversation removed
Refresh the page and confirm that the deleted conversation does not reappear.
Part 24 — Test Mobile UI
Open the Render URL on a mobile device or use browser responsive mode.
Test:
Google Sign-In
Sidebar
New Reflection
Quick Prompts
Message Input
Send Button
AI Response
History
Delete
The mobile Send button should remain completely visible above the browser edge.
Part 25 — Verify Backend Health
The application has a health endpoint.
Open:
https://mindflow-ai-9fho.onrender.com/health
Expected result should indicate that the server is running.
Part 26 — Verify API Configuration
The application exposes:
/api/config
Use this only for the public configuration required by the frontend.
Do not expose private credentials through this endpoint.
Part 27 — Final Architecture
Your current production/demo architecture is:
                         GitHub
                           │
                           │
                           ▼
                         Render
                           │
                           ▼
                    MindFlow AI
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        Firebase        Gemini API     Express
        Authentication                 Backend
             │
             ▼
          Firestore
             │
             ▼
       User Interactions
Part 28 — Deployment Responsibility
Use:
GitHub
for:
Source code
Version control
Project repository
Use:
Render
for:
Live deployment
Demo
Application hosting
Use:
Firebase
for:
Google Authentication
Firestore
User data
Use:
Gemini
for:
AI responses
Reflection analysis
SMART action generation
Use:
Google Cloud Secret Manager
for:
Secure Gemini API key storage
when that configuration is enabled.
Part 29 — Important Security Rules
Never commit:
.env
Never commit:
Firebase service account JSON
Never commit:
Gemini API key
Never put private credentials directly inside:
server.js
services/
controllers/
public/
If an API key is accidentally pushed to GitHub, revoke it and create a new key.
Part 30 — Final GitHub Checklist
Before submission:
[ ] Latest code is pushed to GitHub
[ ] Repository is accessible
[ ] main branch contains latest changes
[ ] .env is not committed
[ ] API keys are not committed
[ ] Google Sign-In is enabled
[ ] Email/Password UI is removed
Part 31 — Final Render Checklist
[ ] Render service is running
[ ] Latest GitHub commit is deployed
[ ] Environment variables are configured
[ ] Firebase configuration works
[ ] Google Sign-In works
[ ] Gemini API works
[ ] Chat works
[ ] Multiple messages work
[ ] Reflection analysis works
[ ] SMART actions work
[ ] Firestore history works
[ ] Delete works
[ ] Mobile UI works
[ ] Send button is visible on mobile
[ ] /health endpoint works
Part 32 — Final Live URL
Your current MindFlow AI deployment is:
https://mindflow-ai-9fho.onrender.com
Use this URL for your live demo/testing.
Part 33 — Challenge Submission
Before submitting, verify what your specific challenge requires.
If the challenge only requires:
Working web application
GitHub repository
Live deployment
your Render deployment can be used.
If the challenge specifically requires:
Google Cloud Run
or:
dev-tutorial=cloud-run-ai-challenge
then Render alone does not satisfy that Cloud Run-specific requirement.
In that case, Cloud Run would need to be deployed separately when your Google Cloud project has the required billing configuration.
Do not delete the working Render deployment.
Final Project Status
GitHub
https://github.com/ashishmandal1889/mindflow-ai

Render
https://mindflow-ai-9fho.onrender.com

Google Cloud Project
mindflow-ai-6d4bf

Authentication
Google Sign-In

AI Model
gemini-3.5-flash-lite

Database
Firestore

Hosting
Render
Recommended final setup:
GitHub
   ↓
Render
   ↓
MindFlow AI
   ├── Google Sign-In
   ├── Gemini AI
   ├── Firestore
   └── Reflection + SMART Actions

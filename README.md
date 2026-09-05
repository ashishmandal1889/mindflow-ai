#  MindFlow AI

> **AI-powered reflective journaling and personal clarity studio built with Google Cloud Run, Firebase, Firestore, and Gemini.**

MindFlow AI helps users turn everyday thoughts, challenges, and experiences into structured reflection, insights, and actionable next steps.

The application combines secure Google authentication, user-isolated Firestore storage, multi-turn Gemini conversations, reflection analysis, SMART-style action synthesis, voice dictation, and export capabilities in a single web experience.

---

##  Features

###  Secure Google Authentication
- Firebase Authentication with Google Sign-In
- No application-managed passwords
- Firebase ID tokens are verified by the backend
- Authenticated users access only their own data

###  Gemini-Powered Reflection
- Multi-turn conversational reflection
- Empathetic and structured responses
- Context-aware journaling conversations
- Resilient Gemini model fallback

###  Reflection Insights
- Emotional sentiment analysis
- Clarity scoring
- Theme extraction
- Structured reflection prompts

###  Action Synthesis
Converts reflective conversations into practical next steps, including prioritized and measurable action items.

###  Voice Dictation
Uses the browser Web Speech API to allow users to speak their reflections instead of typing.

###  Export
Users can export their reflections as Markdown and use the browser's print functionality for PDF output.

###  Cloud-Native Architecture
Designed to run as a containerized Express application on Google Cloud Run with Firebase and Google Cloud services.

---

##  Architecture

```text
                    ┌──────────────────────┐
                    │      User Browser    │
                    │                      │
                    │  MindFlow AI UI      │
                    │  Google Sign-In      │
                    │  Voice Dictation     │
                    └──────────┬───────────┘
                               │
                               │ Firebase ID Token
                               ▼
                    ┌──────────────────────┐
                    │     Cloud Run        │
                    │  Express Backend     │
                    │                      │
                    │  Auth Verification   │
                    │  Gemini Integration  │
                    │  API Endpoints       │
                    └───────┬───────┬──────┘
                            │       │
                ┌───────────┘       └────────────┐
                ▼                                ▼
       ┌─────────────────┐              ┌─────────────────┐
       │    Firestore    │              │   Gemini API    │
       │                 │              │                 │
       │ /users/{uid}/   │              │ Reflection      │
       │ interactions/   │              │ Analysis        │
       └─────────────────┘              │ Actions         │
                                        └─────────────────┘
                                                │
                                                ▼
                                      Gemini Model Fallback
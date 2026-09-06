# MindFlow AI

An AI-powered journaling and reflection companion that helps users understand their thoughts, identify patterns, and turn reflection into meaningful actions.

MindFlow AI is a full-stack web application designed to make personal reflection more structured, insightful, and actionable.

Users can sign in with Google, write reflections, have AI-powered conversations, analyze their thoughts, generate SMART actions, and manage their reflection history.

---

## Live Demo

Live Application:


GitHub Repository:
https://github.com/ashishmandal1889/mindflow-ai

---

## Features

### Google Authentication

- Secure Google Sign-In using Firebase Authentication
- Firebase ID token based authentication
- User-specific reflection data
- Production authentication verification using Firebase Admin SDK

### AI Reflection Chat

- Conversational AI journaling experience
- Users can describe thoughts, problems, goals, or situations
- AI provides empathetic and structured responses
- Conversation context is maintained during a session

### AI-Powered Reflection Analysis

MindFlow AI analyzes reflections and provides:

- Sentiment analysis
- Emotional insights
- Key observations
- Thought patterns
- Practical suggestions

### SMART Action Generation

MindFlow converts reflection into actionable goals using the SMART framework:

- Specific
- Measurable
- Achievable
- Relevant
- Time-bound

This helps users move from thinking to action.

### Reflection History

Users can:

- Save reflections
- View previous conversations
- Continue previous sessions
- Delete saved reflections
- Keep their data associated with their authenticated account

### Voice Input

Users can use voice input to write reflections without typing.

### Export

Reflection content can be exported for personal use.

### Search

Users can search through their saved reflection history.

### Responsive Interface

MindFlow AI works across:

- Desktop
- Tablet
- Mobile

The application includes a responsive mobile sidebar and optimized conversation interface.

### AI Fallback

If Gemini is temporarily unavailable, MindFlow AI provides a safe local fallback response instead of completely breaking the user experience.

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Marked.js
- DOMPurify
- Web Speech API

### Backend

- Node.js
- Express.js
- REST APIs
- MVC architecture

### AI

- Google Gemini API
- Gemini 3.5 Flash-Lite
- Google Gen AI SDK

### Google Cloud

- Google Cloud Run
- Google Cloud Secret Manager
- Firebase Authentication
- Cloud Firestore

### DevOps

- Docker
- Git
- GitHub

---

## Architecture

```text
                         User
                           |
                           v
                    Frontend
               HTML CSS JavaScript
                           |
                           v
                   Express Server
                       Node.js
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
     Controllers       Middleware         Routes
          |                |                |
          |          Firebase Auth         |
          |                                 |
          +----------------+----------------+
                           |
                           v
                       Services
                           |
              +------------+------------+
              |                         |
              v                         v
          Gemini API              Secret Manager
              |
              v
        AI Response

                           |
                           v
                       Firestore
                           |
                           v
                 User Reflection Data
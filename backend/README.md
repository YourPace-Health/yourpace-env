# youPace Backend - Go API Service

This is the Go (Golang) RESTful API service powering the **youPace** health and fitness ecosystem. Built for performance and reliability using the Echo web framework, this service connects to PostgreSQL, implements Redis caching, and integrates with the Google Gemini API and Google Calendar API.

---

## ⚡ Core Features

1.  **AI Nutrition Coach & Tracker:** Analyzes food photography or text logs to return calorie counts, macronutrients, and healthy eating insights using the Google Gemini API.
2.  **AI Fitness Mentor (Chatbot):** An interactive assistant responding to health and wellness questions, automatically personalized based on the user's fitness profile.
3.  **Smart Exercise Scheduling:** Works with **n8n workflows** to automatically look for free slots on the user's Google Calendar and schedule exercises accordingly.
4.  **Habit & Health Tracking:** Tracks daily water intake, body weight fluctuations, and daily mental emotional state check-ins.
5.  **Multi-tier Security:** Implements JSON Web Token (JWT) stateless auth and Google OAuth 2.0.

---

## 📂 Code Directory Structure

```text
backend/
├── config/             # Database initialization (PostgreSQL & Redis)
├── handlers/           # HTTP controllers handling requests (Echo handlers)
├── middleware/         # Custom middlewares (JWT authentication validation)
├── models/             # GORM models defining the database schema
├── services/           # Business logic (Gemini API connector, health formulas, OTP service)
├── main.go             # Application entry point & router setup
├── go.mod / go.sum     # Dependency management files
└── .env.example        # Configuration template for local variables
```

---

## 🚀 Local Development Setup

To run this backend service independently without Docker:

### Prerequisites
*   **Go** 1.20 or higher installed.
*   A running instance of **PostgreSQL** database.
*   A running instance of **Redis** cache.

### Step 1: Initialize Environment Variables
Create a local config file from the template:
```bash
cp .env.example .env
```
Open `.env` and fill in your local Postgres credentials, Redis details, and Gemini/Google OAuth key parameters.

### Step 2: Download Dependencies
```bash
go mod download
```

### Step 3: Run the Server
```bash
go run main.go
```
The server will boot up and automatically run DB migrations. By default, it runs on port `8080`.

---

## 🔑 Key API Endpoints

*   `POST /api/checkin` - Log daily emotional state.
*   `POST /api/meals/analyze-photo` - Upload a meal photo for Gemini-powered nutritional analysis.
*   `POST /api/mentor/chat` - Chat with the AI Fitness Mentor.
*   `POST /api/schedules/generate` - Automatically generate a weekly workout routine.
*   `GET /api/calendar/auth-url` - Retrieve the URL to authorize Google Calendar synchronization.
*   `GET /api/water/today` - View water log for the current day.
*   `POST /api/health/weight` - Log a new weight entry.

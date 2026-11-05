# youPace Frontend - React Application

This is the client-side single-page application (SPA) for the **youPace** health and fitness ecosystem. Built with **React** and **Vite**, the application applies a clean architectural pattern to maintain separation of concerns between data sourcing, domain business logic, and UI rendering.

---

## 🎨 UI & UX Features

*   **Adaptive Health Dashboard:** Provides progress charts for body weight, daily water intake tracking, and mood/emotional check-in analytics.
*   **Meal & Calorie Logger:** Allows users to log food intake, preview nutritional metrics, and upload meal photos to get real-time AI-based nutritional feedback.
*   **Interactive AI Mentor Chat:** A conversational screen where users can communicate with the AI Fitness Coach for advice on health and workout routines.
*   **Workout Scheduler & Calendar:** Visualizes weekly exercise schedules and syncs them with external calendars.
*   **Flexible Authentication:** Supports Email, Magic Link, and Google Social Login.

---

## 🏗️ Architecture Design (Clean Architecture)

The codebase is organized into layers to decouple business logic from the UI and network layers:

```text
frontend/src/
├── data/
│   ├── datasources/       # API/Network connections (Auth, Meal, Mentor, Profile)
│   ├── repositories/      # Concrete repository implementations
│   ├── authFetch.js       # fetch wrapper: renews the access token once on 401
│   └── warmupCooldownData.js
├── domain/                # entities, repository interfaces, use cases (login flows)
├── presentation/
│   ├── components/
│   │   ├── Auth/ Chat/ Charts/ Formatting/ Health/ Meals/ Profile/ Workout/
│   │   └── Dashboard/     # SchedulesView, NutritionView, ProgressView (the dashboard tabs)
│   ├── hooks/             # state + handlers per feature: useMentorChat, useMealTracker,
│   │                      #   useHealthInsights, useGoogleCalendar, useBurnLogger,
│   │                      #   useWarmupGuide, useWaterTracker, useHistoryRoute
│   ├── pages/             # AuthPage, ProfilePage, LandingPage
│   └── utils/             # a11y helpers (clickable, Escape-to-close)
├── App.jsx                # wires hooks to views, session loading, schedule actions
└── main.jsx               # entry point (installs the auth-refresh fetch wrapper)
```

---

## 🚀 Local Development Setup

To run this React application locally on your machine:

### Prerequisites
*   **Node.js** (v18.x or higher recommended) and **npm** installed.
*   The Go API Backend service running (or local ports mapped to it).

### Step 1: Install Dependencies
Navigate to the frontend directory and install dependencies:
```bash
npm install
```

### Step 2: Launch Dev Server
Start the local development server with Hot Module Replacement (HMR) powered by Vite:
```bash
npm run dev
```

The application will launch on [http://localhost:5173](http://localhost:5173) by default (or the port specified in console output).

---

## 📦 Building for Production

To create an optimized production build bundle:
```bash
npm run build
```
This outputs assets into the `dist/` directory, which can then be served by web servers like Nginx or deployed directly to CDNs.

## ✅ Quality checks
```bash
npm run lint   # ESLint incl. jsx-a11y
npm test       # Vitest (hooks, components, helpers)
npm run build
```
`.npmrc` sets `legacy-peer-deps` because `eslint-plugin-jsx-a11y` has not declared ESLint 10 support yet.

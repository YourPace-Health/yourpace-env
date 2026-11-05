# Setup checklist: steps that need your accounts

These steps cannot be done from the code. Do them in order; each one says how to confirm it worked.
Replace the example URLs with your own.

| Name | Example value |
|---|---|
| Backend (Render) | `https://yourpace-backend.onrender.com` |
| Frontend (Vercel) | `https://yourpace-topaz.vercel.app` |

## 1. Deploy the backend on Render

1. Render dashboard -> **New -> Blueprint** -> pick this repo. It reads `render.yaml` and creates the web service, Postgres and Redis (Key Value).
2. When asked for the secrets marked `sync: false`, fill them in:
   - `GEMINI_API_KEY`: from Google AI Studio
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: from step 3
   - `GOOGLE_REDIRECT_URI`: `https://yourpace-backend.onrender.com/api/calendar/callback`
   - `FRONTEND_URL`: your Vercel URL, no trailing slash. Several origins can be comma-separated
3. Leave `MAIL_ENABLED=false` for now (step 5 turns on emails).
4. Wait for the first deploy, then open `https://yourpace-backend.onrender.com/health`. It must return `{"status":"ok"}`. Render's health check uses the same path.

Note: the free plan sleeps after inactivity, so the first request can take about a minute.

## 2. Point the frontend (Vercel) at the backend

1. Vercel -> project `yourpace` -> **Settings -> Environment Variables**.
2. Add `VITE_API_URL` = `https://yourpace-backend.onrender.com/api` (Production and Preview).
3. **Deployments -> Redeploy** (Vite reads the variable at build time, so a rebuild is required).
4. Open the site, register, and check that the dashboard loads.

## 3. Fix Google sign-in (`Error 400: origin_mismatch`)

Google blocks sign-in when the site's origin is not on the OAuth client.

1. Google Cloud Console -> **APIs & Services -> Credentials** -> your **OAuth 2.0 Client ID**.
2. **Authorized JavaScript origins**: add `https://yourpace-topaz.vercel.app` (and `http://localhost:5173`, `http://localhost:3000` for local work). No path, no trailing slash.
3. **Authorized redirect URIs**: add `https://yourpace-backend.onrender.com/api/calendar/callback` (and `http://localhost:8081/api/calendar/callback` for docker-compose).
4. Save. Changes can take a few minutes. Retry Google sign-in in a private window.
5. If the consent screen is in "Testing" mode, add your Google account under **OAuth consent screen -> Test users**.

## 4. Jenkins: rebuild the image and add the Sonar token

The Jenkinsfile now runs real tests, needs Go in the image, and reads the Sonar token from a credential.

1. Rebuild and restart Jenkins:
   ```bash
   docker compose build jenkins && docker compose up -d jenkins
   ```
2. SonarQube (http://localhost:9005) -> **My Account -> Security -> Generate token**. Copy it.
3. Jenkins (http://localhost:8085) -> **Manage Jenkins -> Credentials -> (global) -> Add Credentials**:
   - Kind: **Secret text**
   - Secret: the Sonar token
   - ID: `sonar-token` (must match exactly)
4. Run the pipeline. The backend test stage starts a throwaway Postgres through the Docker socket; if it fails with "permission denied" on `docker`, the Jenkins container needs access to `/var/run/docker.sock` (it is mounted in `docker-compose.yml`).

## 5. Turn on reminder emails (optional)

Reminders only send when `MAIL_ENABLED=true`. The mailer uses Gmail SMTP, so use an **App Password**, not your normal password.

1. Google Account -> **Security -> 2-Step Verification** (must be on) -> **App passwords** -> create one for "yourPace".
2. On Render set `MAIL_ENABLED=true`, `MAIL_USERNAME=<your gmail address>`, `MAIL_PASSWORD=<the app password>`.
3. In the app: Profile page (scroll to the bottom) -> the **แจ้งเตือนการออกกำลังกาย** card -> turn on, pick a time, save.
4. Create a workout for today (or use "Generate schedule"), wait for the chosen time, and check the inbox. A reminder is sent once per workout, within 6 hours after the chosen time.
5. This also enables OTP and magic-link emails, which were only logged to the console before.

## 6. Check on real devices

- **Phone:** open the Vercel URL on your phone. Check the landing page, login, dashboard tabs, and that the pages do not scroll sideways.
- **Keyboard:** Tab through the login form and a modal; Escape should close a modal and the focus outline should be visible.
- **Screen reader:** with NVDA (Windows) or VoiceOver (macOS/iOS), open the log-weight modal. It should announce a dialog, and each field should be read with its label.

## 7. Run the database tests locally

```bash
docker run -d --name yp-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=youpace_test -p 55432:5432 postgres:15-alpine
cd backend
TEST_DATABASE_URL="host=localhost port=55432 user=postgres password=test dbname=youpace_test sslmode=disable" go test ./...
```

Without `TEST_DATABASE_URL` those tests are skipped, not failed.

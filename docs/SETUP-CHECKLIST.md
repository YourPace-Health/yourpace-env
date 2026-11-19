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

## 4. Jenkins: make it run this repo's Jenkinsfile

Your existing Jenkins (`youpace_jenkins`, job `yourpace-cicd`) runs an **inline script** that is not in git,
points at an old empty folder (`Desktop\YourPaceEnv`), and has the SonarQube token typed in as plain text.
Switch it to the repo's `Jenkinsfile`:

1. **Rotate the Sonar token.** The token currently written in the job's script is readable by anyone
   with access to that Jenkins. In SonarQube (http://localhost:9005) -> **My Account -> Security**:
   revoke the old token and generate a new one. Copy the new one.
2. **Rebuild the Jenkins image** (the new one has Go and Node, which the pipeline needs). Use the
   project name your stack already runs under so the existing containers and the `jenkins_data` volume
   are reused:
   ```bash
   docker compose -p yourpaceenv build jenkins
   docker compose -p yourpaceenv up -d jenkins
   ```
   Run this from a folder that contains the repo's `docker-compose.yml` (for example `C:\yp-src`).
   If compose reports that a container name is already in use, stop and tell whoever helps you,
   instead of forcing it: a wrong project name would create an empty second Jenkins.
3. **Add credentials** (Jenkins -> Manage Jenkins -> Credentials -> System -> Global -> Add Credentials):
   | Kind | ID | Content |
   |---|---|---|
   | Secret text | `sonar-token` | the new Sonar token |
   | Secret file | `yourpace-dotenv` | a copy of your `.env` (POSTGRES_PASSWORD, JWT_SECRET, ...) |
4. **Repoint the job:** open `yourpace-cicd` -> **Configure** -> Pipeline -> Definition: **Pipeline script from SCM**
   - SCM: Git, Repository URL `https://github.com/YourPace-Health/yourpace-env.git` (the repo is public, no credential needed)
   - Branch: `*/main`, Script Path: `Jenkinsfile` -> Save.
5. **Run it:** *Build with Parameters*. First run with **DEPLOY unticked** to check everything except the deploy;
   then run with it ticked to rebuild `youpace_backend` and `youpace_frontend`.

What the stages do, and what happens when a credential is missing:

| Stage | Needs | If missing |
|---|---|---|
| Backend vet/tests | Go in the image, Docker socket | build fails (rebuild the image) |
| Frontend lint/tests/build | Node in the image | build fails |
| SonarQube | `sonar-token` | skipped, build UNSTABLE |
| Deploy (when DEPLOY is ticked) | `yourpace-dotenv` | skipped, build UNSTABLE |

## 5. Turn on email (sign-up codes, magic links, workout reminders)

With `MAIL_ENABLED=false` no email is sent: sign-up codes only appear in the server log, so nobody
except you can register with an email address. Turn email on before real users arrive.

**Use an HTTPS mail provider, not Gmail SMTP.** Render's free web services block outbound SMTP
ports, so the old Gmail setup does not work there. The backend now supports **Brevo** and
**Resend** over HTTPS.


> **The mail code must be on `main` first.** Render deploys `main`; until the pull request with
> `MAIL_PROVIDER` support is merged and Render has redeployed, setting these variables does nothing.
> After the redeploy, `GET /health` still answers, and sending a test sign-up code is the real check.

### Brevo (works with just a verified sender address, no domain needed)
1. Create a free account at brevo.com.
2. **Senders, Domains & Dedicated IPs -> Senders -> Add a sender**: use an address you own (for example your Gmail) and confirm the email Brevo sends to it. New accounts may also be asked to complete an account check; finish it.
3. **SMTP & API -> API Keys -> Generate a new API key**. Copy it (shown once).
### Before touching Render: check the key and sender from your own terminal

This proves the Brevo account is ready, so a later failure can only be a Render setting.
Replace the three values (do not paste your key anywhere else).

PowerShell:
```powershell
$key  = "<your Brevo API key>"
$from = "<the sender address you verified>"
$to   = "<an inbox you can read>"
Invoke-RestMethod -Method Post -Uri "https://api.brevo.com/v3/smtp/email" `
  -Headers @{ "api-key" = $key; "accept" = "application/json" } -ContentType "application/json" `
  -Body (@{ sender = @{ email = $from; name = "yourPace" }; to = @(@{ email = $to });
            subject = "yourPace test"; htmlContent = "<p>It works.</p>" } | ConvertTo-Json -Depth 5)
```

bash:
```bash
curl -s -X POST https://api.brevo.com/v3/smtp/email \
  -H "api-key: $KEY" -H "content-type: application/json" \
  -d '{"sender":{"email":"'"$FROM"'","name":"yourPace"},"to":[{"email":"'"$TO"'"}],"subject":"yourPace test","htmlContent":"<p>It works.</p>"}'
```

A `messageId` in the answer means Brevo accepted it; the email arrives within a minute (check spam).
Typical errors: `unauthorized` = wrong API key; `sender ... not valid` = the sender address is not verified yet.

4. Render -> `yourpace-backend` -> **Environment**, add:

   | Key | Value |
   |---|---|
   | `MAIL_ENABLED` | `true` |
   | `MAIL_PROVIDER` | `brevo` |
   | `BREVO_API_KEY` | the API key |
   | `MAIL_FROM` | the sender address you verified |
   | `MAIL_FROM_NAME` | `yourPace` (optional) |

5. Save; Render restarts the service.
6. Test: register a new account with an email you can read. The code should arrive within a minute (check spam the first time). If it does not, Render **Logs** shows `Error sending OTP email ...` with the provider's reason (wrong key, unverified sender, quota).

Free plans have a daily sending limit; check the current number on the provider's page.

### Resend (alternative)
Set `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `MAIL_FROM`. Until you verify your own domain
in Resend, it only delivers to your own account's address, so Brevo is easier for a first launch.

### Reminders
Reminders use the same email setup. In the app: Profile page -> scroll to the
**แจ้งเตือนการออกกำลังกาย** card -> turn on, pick a time, save. A reminder is sent once per
workout, within 6 hours after the chosen time, only for users who turned it on.

### Keep Gmail SMTP (local docker-compose only)
`MAIL_PROVIDER` unset means SMTP: set `MAIL_USERNAME` and `MAIL_PASSWORD` (a Google **App
Password**, 2-Step Verification required). This works on your own machine, not on Render's free plan.

## 6. Check on real devices

- **Phone:** open the Vercel URL on your phone. Check the landing page, login, dashboard tabs, and that the pages do not scroll sideways.
- **Keyboard:** Tab through the login form and a modal; Escape should close a modal and the focus outline should be visible.
- **Screen reader:** with NVDA (Windows) or VoiceOver (macOS/iOS), open the log-weight modal. It should announce a dialog, and each field should be read with its label.

## 7. Move the database before it expires

Render's free Postgres is deleted after its expiry date (yours is **3 December 2026**). Follow
[DATABASE-HOSTING.md](DATABASE-HOSTING.md): back up, restore into a new host, set `DATABASE_URL`.

## 8. Run the database tests locally

```bash
docker run -d --name yp-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=youpace_test -p 55432:5432 postgres:15-alpine
cd backend
TEST_DATABASE_URL="host=localhost port=55432 user=postgres password=test dbname=youpace_test sslmode=disable" go test ./...
```

Without `TEST_DATABASE_URL` those tests are skipped, not failed.

# Moving the database off Render's free Postgres

Render's free Postgres expires (yours: **3 December 2026**). After that the database is deleted,
users and logs included. Move it before then. Aim for **27 November** so there is a week of slack.

The backend now reads **`DATABASE_URL`** (one connection string) and prefers it over the `DB_*`
variables, so moving is a data copy plus one environment variable. No code change is needed.

## Where to host it

| Option | Notes |
|---|---|
| **Neon** (recommended to try first) | Free tier with no expiry date; the database sleeps when idle and wakes in about a second. Gives a `postgres://...` URL with `sslmode=require`. Check the current free storage limit on their pricing page. |
| **Supabase** | Free tier, but projects pause after a period of inactivity, so a quiet app can go offline. |
| **Render paid Postgres** | Same dashboard, no move needed; costs money every month. |

Neon is described below; any host that gives a `postgres://` URL works the same way.

## Steps

You need Docker running (the scripts run `pg_dump`/`psql` inside a container, so nothing else to install).

### 1. Create the new database
1. Sign up at neon.tech, create a project (region closest to your Render region, for example Singapore).
2. Copy the **connection string** (it looks like `postgres://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`). Treat it like a password.

### 2. Get the old database's external URL
Render dashboard -> your Postgres (`yourpace-db`) -> **Connections** -> **External Database URL**.

### 3. Back up the old database
From the repo root:

```powershell
.\scripts\backup-postgres.ps1 -Url "<EXTERNAL URL FROM RENDER>"
```
```bash
./scripts/backup-postgres.sh --url "<EXTERNAL URL FROM RENDER>"
```

This writes `backups/youpace-<time>.sql` (git-ignored). Open the file and check it is not empty and has `CREATE TABLE` lines.

### 4. Restore into the new database
```powershell
.\scripts\backup-postgres.ps1 -Url "<NEW NEON URL>" -Restore backups\youpace-<time>.sql
```
```bash
./scripts/backup-postgres.sh --url "<NEW NEON URL>" --restore backups/youpace-<time>.sql
```

### 5. Point the backend at it
Render -> `yourpace-backend` -> **Environment** -> add `DATABASE_URL` = the Neon URL -> Save.
Render restarts the service. The old `DB_HOST`, `DB_USER`, ... can stay: `DATABASE_URL` wins.

### 6. Check
- `https://<your-backend>/health` returns `{"status":"ok"}`.
- Log in with an existing account; your workouts and weight history are still there.
- In Render's **Logs** you should see "Database connection established successfully" and no migration errors.

### 7. Clean up (only after a few days of normal use)
- Take one more backup of the Neon database as a safety copy.
- Delete the old Render Postgres, **and** remove it from `render.yaml` (the `databases:` block and the `DB_*` env vars that read from it). `render.yaml` is synced automatically, so do that edit deliberately, in its own pull request.

## Keeping backups going forward
Run the backup script against the new URL now and then (weekly is plenty for a small app), and keep the `.sql` files somewhere other than this machine:

```powershell
.\scripts\backup-postgres.ps1 -Url "<NEON URL>"
```

The newest 14 backups are kept; older ones are removed.

## If something goes wrong
- Restore fails halfway: the script stops at the first error (`ON_ERROR_STOP`). Create a fresh empty database and run the restore again.
- Backend cannot connect: check the URL has no spaces, includes `sslmode=require`, and that the Neon project is not suspended; Render's logs show the exact error.
- To go back: remove `DATABASE_URL` from Render and the service uses the old `DB_*` settings again (only works until 3 December).

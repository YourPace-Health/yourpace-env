#!/usr/bin/env bash
# YourPace - Postgres backup/restore.
#
# Local docker-compose database (default):
#   ./scripts/backup-postgres.sh
#   ./scripts/backup-postgres.sh --restore backups/youpace-20260101-120000.sql
#
# Any remote database (Render, Neon, Supabase ...): set DATABASE_URL, or pass --url.
# Needs only Docker; pg_dump/psql run in a postgres:15 container.
#   DATABASE_URL="postgres://user:pass@host:5432/db" ./scripts/backup-postgres.sh
#   ./scripts/backup-postgres.sh --url "postgres://..." --restore backups/file.sql
#
# Moving between hosts: back up the old one, then restore with the NEW url.
set -euo pipefail

CONTAINER="${CONTAINER:-youpace_db}"
DB_USER="${POSTGRES_USER:-root}"
DB_NAME="${POSTGRES_DB:-youPace_DB}"
KEEP="${KEEP:-14}"
IMAGE="${PG_IMAGE:-postgres:15-alpine}"
URL="${DATABASE_URL:-}"
RESTORE=""
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="${2:?--url needs a connection string}"; shift 2 ;;
    --restore) RESTORE="${2:?--restore needs a file}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# Remote mode talks to the URL; local mode execs into the compose container.
dump_cmd() {
  if [[ -n "$URL" ]]; then
    docker run --rm "$IMAGE" pg_dump "$URL" --clean --if-exists --no-owner --no-privileges
  else
    docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner
  fi
}

restore_cmd() {
  if [[ -n "$URL" ]]; then
    docker run --rm -i "$IMAGE" psql "$URL" -v ON_ERROR_STOP=1
  else
    docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
  fi
}

target="local container $CONTAINER"
[[ -n "$URL" ]] && target="remote database"

if [[ -n "$RESTORE" ]]; then
  [[ -f "$RESTORE" ]] || { echo "Backup file not found: $RESTORE" >&2; exit 1; }
  echo "Restoring $RESTORE into the $target (existing objects are dropped)..."
  restore_cmd < "$RESTORE"
  echo "Restore complete."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/youpace-$(date +%Y%m%d-%H%M%S).sql"

# --clean --if-exists makes the dump restorable over an existing database
if ! dump_cmd > "$file"; then
  rm -f "$file"
  echo "pg_dump failed" >&2
  exit 1
fi
[[ -s "$file" ]] || { rm -f "$file"; echo "pg_dump produced an empty file" >&2; exit 1; }
echo "Backup of the $target written to $file ($(wc -c < "$file") bytes)"

# Keep only the newest $KEEP backups
ls -1t "$BACKUP_DIR"/youpace-*.sql | tail -n +"$((KEEP + 1))" | xargs -r rm --

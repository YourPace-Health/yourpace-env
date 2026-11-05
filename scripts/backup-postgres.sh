#!/usr/bin/env bash
# YourPace - Postgres backup/restore for the docker-compose stack.
#   Backup : ./scripts/backup-postgres.sh
#   Restore: ./scripts/backup-postgres.sh --restore backups/youpace-20260101-120000.sql
set -euo pipefail

CONTAINER="${CONTAINER:-youpace_db}"
DB_USER="${POSTGRES_USER:-root}"
DB_NAME="${POSTGRES_DB:-youPace_DB}"
KEEP="${KEEP:-14}"
BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"

if [[ "${1:-}" == "--restore" ]]; then
  file="${2:?usage: $0 --restore <file.sql>}"
  [[ -f "$file" ]] || { echo "Backup file not found: $file" >&2; exit 1; }
  echo "Restoring $file into $DB_NAME (existing objects are dropped)..."
  docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"
  echo "Restore complete."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/youpace-$(date +%Y%m%d-%H%M%S).sql"

# --clean --if-exists makes the dump restorable over an existing database
if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner > "$file"; then
  rm -f "$file"
  echo "pg_dump failed" >&2
  exit 1
fi
echo "Backup written to $file"

# Keep only the newest $KEEP backups
ls -1t "$BACKUP_DIR"/youpace-*.sql | tail -n +"$((KEEP + 1))" | xargs -r rm --

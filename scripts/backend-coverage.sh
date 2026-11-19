#!/usr/bin/env bash
# Runs the backend tests with coverage and fails if total line coverage is below the
# threshold (default 80%). Needs no Docker: handler tests use an in-memory SQLite database
# and in-process fakes for Redis, n8n and Google. Set TEST_DATABASE_URL to run them
# against a real Postgres instead.
set -euo pipefail
THRESHOLD="${COVERAGE_THRESHOLD:-80}"
cd "$(dirname "$0")/../backend"
go test ./... -coverprofile=cover.out
TOTAL=$(go tool cover -func=cover.out | awk '/^total:/ {gsub("%","",$3); print $3}')
echo "Backend total coverage: ${TOTAL}% (threshold ${THRESHOLD}%)"
awk -v t="$TOTAL" -v min="$THRESHOLD" 'BEGIN { exit (t+0 >= min+0) ? 0 : 1 }'

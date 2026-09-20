#!/bin/bash
# DAILY_PERFORMANCE_DIGEST (2026-09-20) — crontab entry point. Same pattern
# as run-link-health-check-cron.sh: builder image (full devDependencies),
# one-off container on precocaindo_internal, never touches the live
# app/db services or Caipira da Gema's own containers/network. Pass --live
# to actually send the email (default is a dry run that only prints it).
set -euo pipefail
cd /opt/precocaindo/app

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env > "$TMP_ENV"

docker run --rm \
  --network precocaindo_internal \
  --env-file "$TMP_ENV" \
  -w /app \
  precocaindo-scripts:latest \
  npx tsx jobs/daily-performance-digest.ts "$@"

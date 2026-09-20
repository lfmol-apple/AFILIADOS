#!/bin/bash
# DAILY_PERFORMANCE_DIGEST (2026-09-20) — crontab entry point. Same pattern
# as run-link-health-check-cron.sh: builder-stage image (full
# devDependencies, so `tsx` exists), one-off container on precocaindo_internal,
# never touches the live app/db services or Caipira da Gema's own
# containers/network. Pass --live to actually send the email (default is a
# dry run that only prints it).
#
# Uses its OWN image (precocaindo-digest), not precocaindo-scripts: that one
# runs the every-4h ML/Shopee automation, and rebuilding it would change the
# code of a job that is live. Rebuild this one after changing the digest:
#   cd /opt/precocaindo/app && docker build --target builder \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://precocaindo.com.br \
#     -t precocaindo-digest:latest .
set -euo pipefail
cd /opt/precocaindo/app

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env > "$TMP_ENV"

docker run --rm \
  --network precocaindo_internal \
  --env-file "$TMP_ENV" \
  -w /app \
  precocaindo-digest:latest \
  npx tsx jobs/daily-performance-digest.ts "$@"

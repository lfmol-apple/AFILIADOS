#!/bin/bash
# TELEGRAM_DIGEST (2026-11-15) — crontab entry point. Same pattern as
# run-daily-digest-cron.sh: builder-stage image (full devDependencies, so
# `tsx` exists), one-off container on precocaindo_internal, never touches
# the live app/db services or Caipira da Gema's own containers/network.
# Pass --live to actually post to the channel (default is a dry run that
# only prints the message).
#
# Uses the shared precocaindo-digest image, not precocaindo-scripts: that
# one runs the every-4h ML/Shopee automation, and rebuilding it would
# change the code of a job that is live. Rebuild this one after changing
# this job or jobs/price-alert-check.ts:
#   cd /opt/precocaindo/app && docker build --target builder \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://precocaindo.com.br \
#     -t precocaindo-digest:latest .
#
# No-ops safely (FAILED AutomationRun, nothing crashes) until
# TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are set in .env — see
# lib/services/telegram-sender.ts's isTelegramConfigured().
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
  npx tsx jobs/telegram-digest.ts "$@"

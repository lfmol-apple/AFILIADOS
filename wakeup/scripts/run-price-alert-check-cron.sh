#!/bin/bash
# PRICE_ALERT_CHECK (2026-11-15) — crontab entry point. Same pattern as
# run-daily-digest-cron.sh: builder-stage image (full devDependencies, so
# `tsx` exists), one-off container on precocaindo_internal, never touches
# the live app/db services or Caipira da Gema's own containers/network.
# Pass --live to actually email real visitors (default is a dry run that
# only prints each would-be email).
#
# Uses the shared precocaindo-digest image, not precocaindo-scripts: that
# one runs the every-4h ML/Shopee automation, and rebuilding it would
# change the code of a job that is live. Rebuild this one after changing
# this job or jobs/telegram-digest.ts:
#   cd /opt/precocaindo/app && docker build --target builder \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://precocaindo.com.br \
#     -t precocaindo-digest:latest .
#
# Safe to run before DAILY_DIGEST_EMAIL_FROM moves off the Resend sandbox
# domain: sendEmail() throws on Resend's non-2xx response (confirmed live,
# 2026-11-15 — sandbox rejects a non-owner recipient with its own 422, not
# a false 200), so a failed send is never marked triggeredAt and gets
# retried automatically once the custom domain is verified.
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
  npx tsx jobs/price-alert-check.ts "$@"

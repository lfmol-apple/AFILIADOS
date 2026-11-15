#!/bin/bash
# WHATSAPP_DIGEST (2026-11-15) — crontab entry point. Same pattern as
# run-telegram-digest-cron.sh, plus one addition: the WhatsApp session
# (private keys from scripts/whatsapp-pair.ts) must be bind-mounted from
# the host at the SAME path every run, or a fresh container would have no
# session and fail instead of sending. Never baked into the image, never
# committed (see .gitignore) — WHATSAPP_SESSION_DIR in .env controls
# where on the host this lives.
#
# Pass --live to actually post (default is a dry run that only prints the
# message). Uses the shared precocaindo-digest image (rebuild command in
# run-telegram-digest-cron.sh's own header).
set -euo pipefail
cd /opt/precocaindo/app

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env > "$TMP_ENV"

# `grep` with no match exits 1, which would kill the script under
# `pipefail` before the `:-` default ever gets a chance — found live,
# 2026-11-15, running this before WHATSAPP_SESSION_DIR existed in .env.
SESSION_DIR="$(grep -E '^WHATSAPP_SESSION_DIR=' .env | sed -E 's/^WHATSAPP_SESSION_DIR="?([^"]*)"?$/\1/' || true)"
SESSION_DIR="${SESSION_DIR:-data/whatsapp-session}"
case "$SESSION_DIR" in
  /*) HOST_SESSION_DIR="$SESSION_DIR" ;;
  *) HOST_SESSION_DIR="/opt/precocaindo/app/$SESSION_DIR" ;;
esac

docker run --rm \
  --network precocaindo_internal \
  --env-file "$TMP_ENV" \
  -v "$HOST_SESSION_DIR:/app/$SESSION_DIR" \
  -w /app \
  precocaindo-digest:latest \
  npx tsx jobs/whatsapp-digest.ts "$@"

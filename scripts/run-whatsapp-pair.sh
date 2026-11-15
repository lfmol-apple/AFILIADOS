#!/bin/bash
# WHATSAPP pairing — interactive, one-time. Same image/session-mount
# pattern as run-whatsapp-digest-cron.sh, but with -it so the QR code
# actually renders in the terminal you're watching. Run this by hand over
# SSH, never from cron.
set -euo pipefail
cd /opt/precocaindo/app

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env > "$TMP_ENV"

SESSION_DIR="$(grep -E '^WHATSAPP_SESSION_DIR=' .env | sed -E 's/^WHATSAPP_SESSION_DIR="?([^"]*)"?$/\1/' || true)"
SESSION_DIR="${SESSION_DIR:-data/whatsapp-session}"
case "$SESSION_DIR" in
  /*) HOST_SESSION_DIR="$SESSION_DIR" ;;
  *) HOST_SESSION_DIR="/opt/precocaindo/app/$SESSION_DIR" ;;
esac
mkdir -p "$HOST_SESSION_DIR"

docker run --rm -it \
  --network precocaindo_internal \
  --env-file "$TMP_ENV" \
  -v "$HOST_SESSION_DIR:/app/$SESSION_DIR" \
  -w /app \
  precocaindo-digest:latest \
  npx tsx scripts/whatsapp-pair.ts

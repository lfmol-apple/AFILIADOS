#!/bin/bash
# WHATSAPP_HARVEST (2026-11-18) — crontab entry point. Same pattern as
# run-whatsapp-digest-cron.sh (same WhatsApp session bind mount, same
# shared precocaindo-digest image), plus a second bind mount: PRODUCT_
# IMAGE_DIR, where this job saves a real product photo (WhatsApp's own
# link-preview thumbnail) that app/api/product-images/[asin]/route.ts
# later serves from the SAME host path (see docker-compose.prod.yml's
# own volume on the `app` service — both containers must agree on this
# directory, or images saved here never reach the live site).
#
# No --live flag, unlike the digest job: this one always runs for real
# (same as jobs/shopee-refresh.ts's own automatic linking) — there's no
# "preview" step for "did a forwarded coupon look right", only per-URL
# skip/activate decisions already made inside the job itself.
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

IMAGE_DIR="$(grep -E '^PRODUCT_IMAGE_DIR=' .env | sed -E 's/^PRODUCT_IMAGE_DIR="?([^"]*)"?$/\1/' || true)"
IMAGE_DIR="${IMAGE_DIR:-data/product-images}"
case "$IMAGE_DIR" in
  /*) HOST_IMAGE_DIR="$IMAGE_DIR" ;;
  *) HOST_IMAGE_DIR="/opt/precocaindo/app/$IMAGE_DIR" ;;
esac
mkdir -p "$HOST_IMAGE_DIR"

docker run --rm \
  --network precocaindo_internal \
  --env-file "$TMP_ENV" \
  -v "$HOST_SESSION_DIR:/app/$SESSION_DIR" \
  -v "$HOST_IMAGE_DIR:/app/$IMAGE_DIR" \
  -w /app \
  precocaindo-digest:latest \
  npx tsx jobs/whatsapp-harvest.ts

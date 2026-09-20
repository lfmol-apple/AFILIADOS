#!/bin/bash
# SEO maintenance (2026-09-20) — calls the running app's internal endpoint so
# every registered affiliate link gets its public page (and sitemap entry)
# without a manual backfill. Runs inside the live app (always current code),
# so unlike the other crons it needs no scripts image. Reads CRON_SECRET from
# .env at call time; the secret never appears in the crontab or the log.
set -euo pipefail
cd /opt/precocaindo/app

SECRET="$(sed -n -E 's/^CRON_SECRET="?([^"]*)"?$/\1/p' .env | head -n1)"
if [ -z "$SECRET" ]; then
  echo "$(date -u +%FT%TZ) CRON_SECRET not set in .env — skipping" >&2
  exit 1
fi

echo -n "$(date -u +%FT%TZ) "
curl -fsS -m 300 -X POST -H "x-cron-secret: ${SECRET}" http://127.0.0.1:3100/api/internal/seo-maintenance
echo

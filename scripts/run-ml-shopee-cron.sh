#!/bin/bash
# ML_SHOPEE_CYCLE (General Market Scanner V1 + Demand-Driven Discovery V1,
# 2026-09-08) — crontab entry point, every 4 hours. Same pattern as
# run-telegram-digest-cron.sh/run-daily-digest-cron.sh: one-off container
# on precocaindo_internal, never touches the live app/db services or
# Caipira da Gema's own containers/network.
#
# Real root cause, 2026-11-22: this exact file was referenced by the real
# crontab since 2026-09-08 but was NEVER committed to this repository —
# confirmed via `git log --all -- scripts/run-ml-shopee-cron.sh` (zero
# history, on any branch). It only ever existed as a loose file on the
# VPS disk, with no version-controlled copy to recover from once it was
# lost (cron logged "not found" on every 4h tick since 2026-11-19 20:04,
# unnoticed until the 2026-11-22 review). This restores it from the real,
# current job entrypoint — jobs/run-ml-shopee-cycle.ts, the same file
# `npm run jobs:run-ml-shopee` already points at — not from any guessed
# or remembered older version, and commits it so a future disk event
# can't silently lose it again the same way.
#
# Uses the shared precocaindo-scripts image, not precocaindo-digest: that
# one is for one-off digest/notification jobs; this one is the every-4h
# ML/Shopee automation that's always live, so its image is rebuilt
# deliberately (not on every unrelated digest-job change) whenever this
# job or one of its real dependencies changes:
#   cd /opt/precocaindo/app && docker build --target builder \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://precocaindo.com.br \
#     -t precocaindo-scripts:latest .
#
# Locking, per-step failure isolation, and AutomationRun observability are
# already handled inside jobs/run-ml-shopee-cycle.ts's own runJob()
# call — this script only invokes it, exactly once, with no flags (the
# job takes none). No --live gate: unlike the digest jobs, this one has
# always run for real since it was first set up (General Market Scanner
# V1); there's no separate "preview" mode to preserve here.
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
  npx tsx jobs/run-ml-shopee-cycle.ts

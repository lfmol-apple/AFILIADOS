#!/bin/bash
# VITRINE_RENEW cycle (2026-11-19) — crontab entry point, same pattern as
# run-daily-digest-cron.sh: builder-stage image (precocaindo-digest), one-
# off container on precocaindo_internal, never touches the live app/db
# services or Caipira da Gema's own containers/network.
#
# Runs, in order, every job the daily Vitrine renewal depends on:
#   ML_TREND_ROLLUP    — rolls up rank history into 7d/30d/90d trend
#   VITRINE_DISCOVERY  — scans categories tied to active commercial events,
#                        even outside the regular ML_DEMAND rotation
#   VITRINE_RENEW      — re-selects/promotes/retires the showcase itself
# Each step is a separate runJob() call (its own AutomationRun row,
# locking, PARTIAL/FAILED on its own) — one step failing does not skip the
# next, same "falha parcial não derruba o ciclo inteiro" rule as the main
# ML/Shopee cycle (jobs/run-ml-shopee-cycle.ts).
#
# NOT installed in crontab yet — see docs/VITRINE_INTELIGENTE.md for the
# safety review this needs before its first production run.
set -uo pipefail
cd /opt/precocaindo/app

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
sed -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env > "$TMP_ENV"

run() {
  docker run --rm \
    --network precocaindo_internal \
    --env-file "$TMP_ENV" \
    -w /app \
    precocaindo-digest:latest \
    npx tsx "$1"
}

run jobs/ml-trend-rollup.ts
run jobs/vitrine-discovery.ts
run jobs/vitrine-renew.ts

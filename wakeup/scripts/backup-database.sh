#!/usr/bin/env bash
# Dumps the PreçoCaindo Postgres database to a timestamped, gzipped file
# and prunes backups older than the retention window. See docs/BACKUP.md.
#
# Never put credentials in this script — it reads DATABASE_URL from the
# environment (export it, or run via `dotenv -e .env -- npm run db:backup`
# / `env $(cat .env | xargs) npm run db:backup`), exactly like every other
# script in this project (prisma/seed.ts, scripts/production-readiness.ts).
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/db" npm run db:backup
#   BACKUP_DIR=/var/backups/precocaindo RETENTION_DAYS=14 npm run db:backup

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it or run via your .env — see docs/BACKUP.md." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="precocaindo-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up to ${BACKUP_DIR}/${FILENAME} ..."
pg_dump "$DATABASE_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"
echo "Done: $(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)"

echo "Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR} ..."
find "$BACKUP_DIR" -name 'precocaindo-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete

#!/bin/bash
# Daily PostgreSQL backup — crontab entry point. Uses pg_dump from the
# PreçoCaindo db container itself (no host client, no credential on the
# host). Writes to a temp file, reads the whole archive back before
# keeping it, and only prunes files this script created.
set -euo pipefail
umask 077

DIR="${BACKUP_DIR:-/opt/precocaindo/backups/daily}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER=precocaindo-db-1
FILE="$DIR/precocaindo-daily-$(date -u +%Y%m%dT%H%M%SZ).dump"

mkdir -p "$DIR"
trap 'rm -f "$FILE.tmp"' EXIT

docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE.tmp"
docker exec -i "$CONTAINER" pg_restore -f /dev/null < "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
echo "$(date -u +%FT%TZ) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

find "$DIR" -name 'precocaindo-daily-*.dump' -mtime "+$RETENTION_DAYS" -print -delete

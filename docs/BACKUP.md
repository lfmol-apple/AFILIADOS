# Backup

## What gets backed up

Only PostgreSQL — it's the single source of truth for everything the app
knows (products, prices, content, clicks, admin sessions). There's nothing
else stateful: the app itself is stateless (rebuilt from the Docker image),
and secrets live in `.env` on the VPS, not in the database.

## Running a backup

```bash
DATABASE_URL="postgresql://user:pass@host:5432/precocaindo" npm run db:backup
```

This runs `scripts/backup-database.sh`, which:

1. `pg_dump`s the database given by `DATABASE_URL`.
2. Gzips it to `./backups/precocaindo-<UTC timestamp>.sql.gz` (override the
   directory with `BACKUP_DIR=/var/backups/precocaindo`).
3. Deletes backups older than `RETENTION_DAYS` (default 14).

The script never contains a credential — `DATABASE_URL` always comes from
the environment, exactly like every other script in this project
(`prisma/seed.ts`, `scripts/production-readiness.ts`).

**Version note:** `pg_dump`'s client version must match (or exceed) the
Postgres server version — a client older than the server refuses to dump
("server version mismatch"). On the VPS, install `postgresql-client-16` to
match the `postgres:16-alpine` image in `docker-compose.prod.yml`. If
running the backup from inside the stack instead, use the server's own
`pg_dump`:

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U precocaindo precocaindo | gzip > backups/precocaindo-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

## Restoring

```bash
gunzip -c backups/precocaindo-<timestamp>.sql.gz | psql "$DATABASE_URL"
```

Restoring into a database that already has data will conflict on primary
keys/unique constraints — restore into an empty database (a fresh
`docker compose exec db psql -U precocaindo -c 'CREATE DATABASE precocaindo_restore'`,
or drop and recreate the volume) unless you specifically intend to
overwrite the current state. Always take a fresh backup of the *current*
state before restoring an old one, in case the restore needs to be undone.

## Automating with cron (not wired up yet)

This sprint intentionally does not schedule the backup — it only makes it
runnable. Once the VPS is live, wire it up with plain crontab (no reason to
add a scheduler dependency for one nightly command):

```cron
0 3 * * * cd /opt/precocaindo && DATABASE_URL="$(grep DATABASE_URL .env | cut -d= -f2- | tr -d '"')" BACKUP_DIR=/var/backups/precocaindo npm run db:backup >> /var/log/precocaindo-backup.log 2>&1
```

Off-host copies (rclone to object storage, etc.) are a reasonable next step
once backups are actually running — not set up here, since there's nothing
to copy off-host yet.

## Retention

Default: 14 daily backups kept locally on the VPS (`RETENTION_DAYS=14`).
This protects against "yesterday's deploy broke something" and "I fat
fingered a query in `/admin`" — it does not protect against the VPS itself
being lost (disk failure, provider issue). Once real traffic exists,
revisit: at minimum, ship backups to a second location (object storage),
and consider a longer weekly/monthly retention tier.

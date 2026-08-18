# Operations

Day-to-day operational reference for a running deploy. See
docs/DEPLOYMENT.md for how to stand the stack up in the first place, and
docs/BACKUP.md for backups.

## Logs

Structured JSON, one line per event, from `lib/observability/logger.ts` —
no logging framework, just `console.log`/`warn`/`error` with a consistent
shape (`level`, `event`, `ts`, plus event-specific fields). Every field
named like a secret (`password`, `token`, `cookie`, `secret`, `apikey`,
`authorization`, `session`) is automatically redacted before the line is
emitted — a safety net, not the primary control; callers are still
responsible for not passing a real IP or other sensitive value in the
first place.

Events currently logged:

| Event | Where | When |
| --- | --- | --- |
| `app.startup` | `instrumentation.ts` | Once per server process start — logs the operating mode (provider, content generation, catalog gate, auto-publish), never secrets. |
| `jobs.step_start` / `jobs.step_done` / `jobs.step_failed` | `jobs/run.ts` | Each job in a cycle (or single `jobs:run <JOB>` invocation). |
| `jobs.cycle_aborted` | `jobs/run.ts` | A full cycle couldn't start — almost always because another cycle is still running (see "Jobs" below). |
| `provider.disabled_marketplace_requested` / `provider.construction_failed` / `provider.not_implemented` | `lib/providers/` | A `CommerceProvider` was requested or called in a way that can't work yet. |
| `health.database_unreachable` / `health.migrations_check_failed` | `lib/observability/health.ts` | `/api/health` found a real problem. |
| `affiliate.redirect` / `affiliate.redirect_rejected` | `lib/services/go-amazon-handler.ts` | Every `/go/amazon/...` hit — asin/marketplace only, never anything personal. |
| `admin.login.success` / `admin.login.failed` / `admin.login.rate_limited` | `app/api/admin/login/route.ts` | Every login attempt against `/admin` — IP is reduced to `"redacted"` or `"unknown"` before logging, never the raw address. |

With Docker Compose (`docker-compose.prod.yml`), read logs with:

```bash
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f app | grep '"level":"error"'
```

## Health

```bash
curl https://precocaindo.com.br/api/health
```

Returns `200` with `status: "healthy"|"degraded"` or `503` with
`status: "unhealthy"`. Checks: real database connectivity (`SELECT 1`),
migration state (a cheap query against `_prisma_migrations`, not a
subprocess — safe to poll frequently), and automation health (failure rate
of `AutomationRun`s in the last 24h). Never includes a secret, connection
string, or anything else sensitive — see `tests/health.test.ts`.

Point any external uptime monitor (UptimeRobot, a systemd timer +
`curl -f`, etc.) at this endpoint; `docker-compose.prod.yml`'s `app`
service also uses it for its own container healthcheck.

## Jobs

```bash
npm run jobs:run                          # the full daily cycle, in order
npm run jobs:run CALCULATE_OPPORTUNITIES  # one job
```

See docs/AUTOMATION.md for what each of the 13 jobs does. Two overlapping
full-cycle runs (a slow cron invocation still running when the next tick
fires) can't run concurrently — the whole cycle is wrapped in one more
`AutomationRun` lock (job name `"JOBS_CYCLE"`), on top of each individual
job's own existing lock. The second invocation exits non-zero with a
`jobs.cycle_aborted` log line instead of interleaving with the first; cron
will simply try again next tick. See `tests/jobs-cycle-lock.test.ts`.

**Not scheduled yet.** This sprint prepares `jobs:run` to be cron-safe but
deliberately does not add a crontab entry — enabling the automated cycle
is a separate, explicit decision. When ready:

```cron
*/15 * * * * cd /opt/precocaindo && docker compose -f docker-compose.prod.yml exec -T app npm run jobs:run >> /var/log/precocaindo-jobs.log 2>&1
```

Adjust the interval once real Amazon rate limits are known (see
`lib/services/refresh-planner.ts` / docs/AUTOMATION.md) — `*/15` is a
reasonable starting cadence for a mock-provider deploy, not a confirmed
production rate.

## Admin panel

`https://precocaindo.com.br/admin` — session-cookie login (not the old
URL-token scheme). See docs/PRODUCTION_READINESS.md's `ADMIN_SECURED`
section for how the password is set. To rotate the password: generate a
new hash with `npm run admin:hash-password -- 'new-password'`, update
`ADMIN_PASSWORD_HASH` in `.env`, restart the `app` service — this
invalidates nothing automatically for *existing* sessions (they're
independent rows in `AdminSession`, not derived from the password), so
also clear them if you suspect compromise:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U precocaindo -c 'DELETE FROM "AdminSession";'
```

Failed logins are rate-limited per IP (5 failures / 15 minutes) — see
`lib/admin/auth.ts`. A locked-out legitimate admin just needs to wait out
the window; there's no manual unlock command by design (nothing sensitive
enough here to justify one).

## Deploying an update

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build app
docker compose -f docker-compose.prod.yml exec app node node_modules/prisma/build/index.js migrate deploy
```

Run migrations *after* the new image is up — `prisma migrate deploy` only
applies additive/backward-compatible migrations by convention in this
project (see the migration-authoring notes in docs/ARCHITECTURE.md), so
briefly running old code against a migrated schema, or new code against
the pre-migration schema, is expected to be safe either order — but
running migrations right after the new container is confirmed healthy
keeps the window short regardless.

## Rollback

```bash
git checkout <previous-good-commit>
docker compose -f docker-compose.prod.yml up -d --build app
```

Since migrations in this project are additive-only (never destructive —
see docs/ARCHITECTURE.md), rolling back the app image without rolling back
the database is safe: older code simply doesn't read the newer columns.
Rolling back a migration itself is not automated (Prisma has no built-in
`migrate down`) — if a migration genuinely needs reverting, write a new
forward migration that undoes it, don't hand-edit history.

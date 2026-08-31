# Production readiness

```bash
npm run production:readiness
```

Runs `scripts/production-readiness.ts` (a thin CLI wrapper around
`lib/readiness/report.ts` — see that module for the full logic and
`tests/marketplace-data-isolation.test.ts` for its tests), which checks
what can honestly be checked by code and prints a report grouped into
three verdicts:

```
DATABASE_READY.................... PASS
INFRASTRUCTURE_READY.............. PASS (tests green)
ADMIN_SECURED..................... PASS (session auth configured)
DOMAIN_CONFIGURED................. PASS (precocaindo.com.br)
MOCK_DATA_PUBLICLY_HIDDEN......... PASS
AMAZON_PROVIDER................... MOCK
AUTO_PUBLISH...................... OFF
AMAZON_BR_TRACKING_ID............. PASS

SITE_LAUNCH_READY................. READY

PUBLIC_CATALOG_SAFE............... PENDING (pre-launch / catalog withheld)
REAL_CATALOG_AVAILABLE............ PENDING (AMAZON_PROVIDER=mock)

CATALOG_LAUNCH_READY.............. NOT READY

AMAZON_BR_ACCOUNT_APPROVED........ PENDING
AMAZON_BR_QUALIFIED_SALES......... PENDING
AMAZON_BR_API_CREDENTIALS......... PENDING
AMAZON_BR_LIVE_PROVIDER........... PENDING

PRODUCTION......................... NOT READY

AMAZON_US_PRECOCAINDO_REGISTERED.. PENDING (informational, does not block BR)
AMAZON_US_PAYMENT_CONFIGURED...... PENDING (informational, does not block BR)
AMAZON_US_ACCOUNT_STATUS.......... PENDING (informational, does not block BR)
AMAZON_US_API_CREDENTIALS......... PENDING (informational, does not block BR)
```

**This exact shape (SITE_LAUNCH_READY=READY, everything else NOT READY) is
the correct, expected state for the first real deploy.** The script does
not try to make every line say PASS by inventing configuration (project
brief: "NÃO tente transformar tudo em PASS inventando configuração"); a
`PENDING`/`FAIL` line is the script doing its job correctly, not a bug.

## Three verdicts, not one

Since Sprint 5, the script prints **three** independent, increasingly
strict verdicts — this replaces an earlier two-verdict design
(`BR_LAUNCH_READY`/`PRODUCTION`) that incorrectly made an institutional
pre-launch site wait on the public catalog being safe to show, which are
two genuinely different questions:

- **`SITE_LAUNCH_READY`** — precocaindo.com.br can receive real traffic in
  institutional/pre-launch mode (homepage, `/transparencia`,
  `/como-funciona`, etc., with the product catalog withheld). Blocked only
  by `DATABASE_READY`, `INFRASTRUCTURE_READY`, `ADMIN_SECURED`,
  `DOMAIN_CONFIGURED`, `MOCK_DATA_PUBLICLY_HIDDEN`, and
  `AMAZON_BR_TRACKING_ID`. Never requires the catalog to actually be shown,
  never requires Amazon API access, never requires qualified sales, never
  depends on US.
- **`CATALOG_LAUNCH_READY`** — the public catalog itself (`/produto`,
  `/ofertas`, `/categorias`, `/melhores`, `/comparar`) can be shown.
  Additionally blocked by `PUBLIC_CATALOG_SAFE` (the `PUBLIC_CATALOG_ENABLED`
  flag actually turned on) and `REAL_CATALOG_AVAILABLE` (non-mock data
  actually exists).
- **`PRODUCTION`** — fully live selling through the real Amazon BR
  Creators API. Additionally blocked by `AMAZON_BR_ACCOUNT_APPROVED`,
  `AMAZON_BR_QUALIFIED_SALES`, `AMAZON_BR_API_CREDENTIALS` and
  `AMAZON_BR_LIVE_PROVIDER`.

Each verdict's blockers are a superset of the one before it — everything
that blocks `SITE_LAUNCH_READY` also blocks `CATALOG_LAUNCH_READY` and
`PRODUCTION`, but not the other way around.

**No verdict is ever blocked by an `AMAZON_US_*` line** — "pendências dos
EUA NÃO devem impedir precocaindo.com.br de lançar no Brasil" (project
brief, verbatim). The US lines are always printed, always informational,
and can sit `PENDING` forever without affecting any verdict.

## What each line means

| Line                         | PASS condition                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_READY`             | `SELECT 1` succeeds **and** `prisma migrate status` reports nothing pending         | A DB that's reachable but schema-drifted is not "ready".                                                                                                                                                                                                                                                                                                                                      |
| `INFRASTRUCTURE_READY`       | `vitest run` exits 0                                                                | The CLI script runs the real suite once and passes the boolean result into `buildReadinessReport()` — the pure report module never spawns tests itself (would recurse if called from inside a test).                                                                                                                                                                                          |
| `ADMIN_SECURED`              | `ADMIN_PASSWORD_HASH` is set to a real scrypt hash                                  | Tests the actual auth implementation (`lib/admin/auth.ts` session-cookie login) — replaced the old `ADMIN_ACCESS_TOKEN` shared-secret-in-the-URL scheme, which was never real authentication. Unset is tolerated as `PENDING` outside production (matches the app's own dev-mode bypass) but always blocks the verdict — "ready to launch" implies "ready for production traffic" either way. |
| `DOMAIN_CONFIGURED`          | `NEXT_PUBLIC_SITE_URL` equals `https://precocaindo.com.br`                          | Never true until an actual deploy happens.                                                                                                                                                                                                                                                                                                                                                    |
| `MOCK_DATA_PUBLICLY_HIDDEN`  | NOT (production AND mock provider AND catalog flag on)                              | See `lib/config/public-catalog.ts`'s `isMockDataPubliclyHidden()`. Always `PASS` while `PUBLIC_CATALOG_ENABLED=false` (the default) — this is the narrow, always-achievable safety bar that only `SITE_LAUNCH_READY` needs. Contrast with `PUBLIC_CATALOG_SAFE` below.                                                                                                                        |
| `AMAZON_PROVIDER`            | Informational (MOCK/LIVE)                                                           | Not a pass/fail — just current mode.                                                                                                                                                                                                                                                                                                                                                          |
| `AUTO_PUBLISH`               | Informational (ON/OFF)                                                              | Not a pass/fail — `OFF` is the correct default, not a blocker.                                                                                                                                                                                                                                                                                                                                |
| `AMAZON_BR_TRACKING_ID`      | `AMAZON_BR_ASSOCIATE_TAG` is set                                                    | Tracking ID confirmado pelo proprietário em 2026-08-31: `precocaindo0c-20`. Ainda precisa ser configurado explicitamente em cada `.env` real (o schema nunca assume esse valor). Nunca usar `petmol-20` ou qualquer ID histórico.                                                                                                                                                             |
| `PUBLIC_CATALOG_SAFE`        | `isPublicCatalogSafeToShow()` is `true`                                             | Requires `PUBLIC_CATALOG_ENABLED=true` (a deliberate human decision) and forbids production+mock. `PENDING` here is the honest pre-launch state — it blocks `CATALOG_LAUNCH_READY` only, never `SITE_LAUNCH_READY`.                                                                                                                                                                           |
| `REAL_CATALOG_AVAILABLE`     | `AMAZON_PROVIDER=live` **and** at least one active BR product has real `PriceStats` | Always `PENDING` while mock — there's no such thing as "real" catalog data from a mock provider, by definition.                                                                                                                                                                                                                                                                               |
| `AMAZON_BR_ACCOUNT_APPROVED` | `AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED=true`                                      | Only a human can set this, after Amazon itself shows the account as approved for the Creators API — not inferable from panel activity. Blocks `PRODUCTION` only.                                                                                                                                                                                                                              |
| `AMAZON_BR_QUALIFIED_SALES`  | `AMAZON_BR_QUALIFIED_SALES_MET=true`                                                | Only Amazon's own confirmation of "10 vendas qualificadas nos últimos 30 dias" counts, never click/order counts from the affiliate panel. Blocks `PRODUCTION` only.                                                                                                                                                                                                                           |
| `AMAZON_BR_API_CREDENTIALS`  | Access key + secret configured                                                      | Configuration presence only — does not verify the credentials actually work. Blocks `PRODUCTION` only.                                                                                                                                                                                                                                                                                        |
| `AMAZON_BR_LIVE_PROVIDER`    | `AMAZON_PROVIDER=live` **and** the BR API is enabled                                | Proves the app is actually configured to call the real API, not just that credentials exist. Blocks `PRODUCTION` only.                                                                                                                                                                                                                                                                        |
| `AMAZON_US_*` (4 lines)      | Same conditions as their BR counterparts, for the US account                        | Always informational — never blocks any verdict.                                                                                                                                                                                                                                                                                                                                              |

## Human launch items

These items are intentionally not guessed by code:

- **Institutional contact:** confirmed by the owner on 2026-08-31 —
  `lfmol@yahoo.com.br`. `/contato` now exists and points to this address.
- **Current Amazon BR Tracking ID:** confirmed by the owner on 2026-08-31,
  directly from the "Vincular lojas" screen in Associates Central:
  **`precocaindo0c-20`**. Earlier project notes had guessed `precocaindo-20`
  (missing the `0c`) — that guess was wrong and must not be reused anywhere.
  `AMAZON_BR_ASSOCIATE_TAG` must still be set explicitly per environment
  (local `.env`, production `.env`) — this confirmation does not change the
  schema default, which stays empty on purpose.

## Admin security

`ADMIN_PASSWORD_HASH` (a scrypt hash, generated via
`npm run admin:hash-password -- 'your-password'`) backs a real
session-cookie login at `/admin` — HttpOnly, `Secure` in production,
`SameSite=Lax`, 12-hour expiry, with per-IP rate limiting on failed
attempts (5 failures / 15 minutes). See `lib/admin/auth.ts` and
`tests/admin-auth.test.ts`. This replaces the old
`ADMIN_ACCESS_TOKEN=?token=...` scheme, which compared a shared secret via
`===` and was never real authentication (visible in browser history,
referrer headers, and server access logs).

When `ADMIN_PASSWORD_HASH` is unset, `/admin` is open without login — but
**only outside production** (`NODE_ENV !== "production"`); in production
it hard-blocks instead of silently becoming public. `ADMIN_SECURED` in
this report reflects that same policy exactly (see `isAdminRequestAuthorized()`
in `lib/admin/auth.ts` — the login page, the page's own check, and this
readiness line all call the same function, so none of them can disagree).

## Why this isn't in CI

`production:readiness` is a standalone command, not part of
`.github/workflows/ci.yml`. CI's job is "does the code work"
(lint/typecheck/test/compliance/build); this script's job is "is _this
specific deployment's configuration_ ready to go live", which is expected
to read `CATALOG_LAUNCH_READY`/`PRODUCTION` as `NOT READY` for a long time
during normal operation. Wiring it into CI would make every PR red until
the business has finished onboarding with Amazon — that's not a useful
signal.

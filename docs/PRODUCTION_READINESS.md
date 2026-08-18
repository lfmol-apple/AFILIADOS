# Production readiness

```bash
npm run production:readiness
```

Runs `scripts/production-readiness.ts` (a thin CLI wrapper around `lib/readiness/report.ts` —
see that module for the full logic and `tests/marketplace-data-isolation.test.ts` for its tests),
which checks what can honestly be checked by code and prints a report like:

```
DATABASE_READY..................... PASS
INFRASTRUCTURE_READY............... PASS (tests green)
ADMIN_SECURED....................... FAIL (dev-only, no token)
DOMAIN_CONFIGURED................... FAIL (http://localhost:3000)
PUBLIC_CATALOG_SAFE................. PASS (safe to show)
AMAZON_PROVIDER..................... MOCK
AUTO_PUBLISH......................... OFF
CATALOG_CONTENT_BR.................. PASS (10 products)
AMAZON_BR_TRACKING_ID............... PASS
AMAZON_BR_ACCOUNT_APPROVED.......... PENDING
AMAZON_BR_QUALIFIED_SALES........... PENDING
AMAZON_BR_API_CREDENTIALS........... PENDING
AMAZON_BR_LIVE_PROVIDER............. PENDING
AMAZON_US_PRECOCAINDO_REGISTERED.... PENDING (informational, does not block BR)
AMAZON_US_PAYMENT_CONFIGURED........ PENDING (informational, does not block BR)
AMAZON_US_ACCOUNT_STATUS............ PENDING (informational, does not block BR)
AMAZON_US_API_CREDENTIALS........... PENDING (informational, does not block BR)

BR_LAUNCH_READY...................... NOT READY
PRODUCTION............................ NOT READY
```

**This is expected to say NOT READY today** — but note the two separate verdicts. The script does
not try to make every line say PASS by inventing configuration (project brief: "NÃO tente
transformar tudo em PASS inventando configuração"); a `PENDING`/`FAIL` line is the script doing its
job correctly, not a bug.

## Two verdicts, not one

Since Sprint 4, the script prints **two** independent verdicts instead of one:

- **`BR_LAUNCH_READY`** — everything needed to put precocaindo.com.br online in Brazil today, in
  whatever mode (institutional pre-launch, or live once the BR tracking ID and infra are in
  place). Blocked only by `DATABASE_READY`, `INFRASTRUCTURE_READY`, `ADMIN_SECURED`,
  `DOMAIN_CONFIGURED`, `PUBLIC_CATALOG_SAFE`, and `AMAZON_BR_TRACKING_ID`.
- **`PRODUCTION`** — fully live selling through the real Amazon BR Creators API. Additionally
  blocked by `AMAZON_BR_ACCOUNT_APPROVED`, `AMAZON_BR_QUALIFIED_SALES`, `AMAZON_BR_API_CREDENTIALS`
  and `AMAZON_BR_LIVE_PROVIDER`.

**Neither verdict is ever blocked by an `AMAZON_US_*` line** — "pendências dos EUA NÃO devem
impedir precocaindo.com.br de lançar no Brasil" (project brief, verbatim). The US lines are always
printed, always informational, and can sit `PENDING` forever without affecting either verdict.
This split exists specifically so the business doesn't have to wait on US Amazon Associates
approval (registration, payment setup, review) to launch the BR site.

## What each line means

| Line | PASS condition | Notes |
| --- | --- | --- |
| `DATABASE_READY` | `SELECT 1` succeeds **and** `prisma migrate status` reports nothing pending | Merges the old separate DATABASE/MIGRATIONS checks — a DB that's reachable but schema-drifted is not "ready". |
| `INFRASTRUCTURE_READY` | `vitest run` exits 0 | The CLI script runs the real suite once and passes the boolean result into `buildReadinessReport()` — the pure report module never spawns tests itself (would recurse if called from inside a test). |
| `ADMIN_SECURED` | `ADMIN_ACCESS_TOKEN` is set | A token being set is dev-grade protection, not real auth — see "Admin security" below. |
| `DOMAIN_CONFIGURED` | `NEXT_PUBLIC_SITE_URL` equals `https://precocaindo.com.br` | Never true until an actual deploy happens. |
| `PUBLIC_CATALOG_SAFE` | `isPublicCatalogSafeToShow()` is `true` | See `lib/config/public-catalog.ts` / docs/AMAZON.md "Pré-lançamento" — requires `PUBLIC_CATALOG_ENABLED=true` and forbids `NODE_ENV=production` + `AMAZON_PROVIDER=mock`. `PENDING` here is the honest pre-launch state, not a bug. |
| `AMAZON_PROVIDER` | Informational (MOCK/LIVE) | Not a pass/fail — just current mode. |
| `AUTO_PUBLISH` | Informational (ON/OFF) | Not a pass/fail — `OFF` is the correct default, not a blocker. |
| `CATALOG_CONTENT_BR` | At least one active BR product has PriceStats | Informational only — a fresh pre-launch deploy with zero content is expected and must never block anything by itself; `PUBLIC_CATALOG_SAFE` is what actually gates whether content is shown. |
| `AMAZON_BR_TRACKING_ID` | `AMAZON_BR_ASSOCIATE_TAG` is set | PreçoCaindo's own BR tag, `precocaindo-20` — never `petmol-20`. The only Amazon line that blocks `BR_LAUNCH_READY`. |
| `AMAZON_BR_ACCOUNT_APPROVED` | `AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED=true` | Only a human can set this, after Amazon itself shows the account as approved for the Creators API — not inferable from panel activity. Blocks `PRODUCTION` only. |
| `AMAZON_BR_QUALIFIED_SALES` | `AMAZON_BR_QUALIFIED_SALES_MET=true` | Only Amazon's own confirmation of "10 vendas qualificadas nos últimos 30 dias" counts, never click/order counts from the affiliate panel. Blocks `PRODUCTION` only. |
| `AMAZON_BR_API_CREDENTIALS` | Access key + secret configured | Configuration presence only — does not verify the credentials actually work. Blocks `PRODUCTION` only. |
| `AMAZON_BR_LIVE_PROVIDER` | `AMAZON_PROVIDER=live` **and** the BR API is enabled | Proves the app is actually configured to call the real API, not just that credentials exist. Blocks `PRODUCTION` only. |
| `AMAZON_US_*` (4 lines) | Same conditions as their BR counterparts, for the US account | Always informational — never blocks `BR_LAUNCH_READY` or `PRODUCTION`. |

## Admin security

`ADMIN_ACCESS_TOKEN` is a shared secret compared via `===` in `app/admin/page.tsx` — acceptable
for local development, **not** a production authentication system. It doesn't rate-limit
attempts, doesn't rotate, and isn't tied to an identity. Before `/admin` is ever exposed on a real
domain, replace this with real authentication (session-based auth, an identity provider, or at
minimum a properly rate-limited, hashed-comparison secret). Until then, `production:readiness`
reports `ADMIN_SECURED` as blocking even when a token is set, because a shared secret alone is
not what "production readiness" should mean for an admin surface with access to click/pageview
data.

## Why this isn't in CI

`production:readiness` is a standalone command, not part of `.github/workflows/ci.yml`. CI's job
is "does the code work" (lint/typecheck/test/build); this script's job is "is *this specific
deployment's configuration* ready to go live", which is expected to be `NOT READY` for a long
time during normal development. Wiring it into CI would make every PR red until the business has
finished onboarding with Amazon — that's not a useful signal.

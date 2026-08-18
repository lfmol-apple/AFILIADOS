# Production readiness

```bash
npm run production:readiness
```

Runs `scripts/production-readiness.ts`, which checks what can honestly be checked by code and
prints a report like:

```
DATABASE............ PASS
MIGRATIONS.......... PASS
TESTS............... PASS
SEO................. PASS
AMAZON PROVIDER..... MOCK
AMAZON TRACKING ID.. PENDING
CREATORS API........ PENDING
AUTO PUBLISH........ OFF
ADMIN SECURITY...... DEV ONLY
DOMAIN.............. NOT DEPLOYED
PRODUCTION.......... NOT READY
```

**This is expected to say NOT READY today.** The script does not try to make every line say PASS
by inventing configuration — a `PENDING`/`NOT DEPLOYED` line is the script doing its job
correctly, not a bug (project brief: "Isso é intencional. NÃO tente transformar tudo em PASS
inventando configuração").

## What each line means

| Line | PASS condition | Notes |
| --- | --- | --- |
| DATABASE | `SELECT 1` succeeds | Real connectivity check, not just "Prisma constructed". |
| MIGRATIONS | `prisma migrate status` reports nothing pending | Fails if the schema and migration history have drifted. |
| TESTS | `vitest run` exits 0 | Runs the full suite as part of this check. |
| SEO | At least one active product has PriceStats | A minimal sanity check that there's something to serve/index — not a substitute for `docs/SEO.md`'s checklist. |
| AMAZON PROVIDER | Informational (MOCK/LIVE) | Not a pass/fail — just current mode. |
| AMAZON TRACKING ID | `AMAZON_ASSOCIATE_TAG` is set | Must be PreçoCaindo's own tag, never `petmol-20` — see docs/AMAZON.md. |
| CREATORS API | Access key + secret configured | Configuration presence only — does not verify the credentials actually work. |
| AUTO PUBLISH | Informational (ON/OFF) | Not a pass/fail — `OFF` is the correct default, not a blocker. |
| ADMIN SECURITY | `ADMIN_ACCESS_TOKEN` is set | A token being set is dev-grade protection, not real auth — see "Admin security" below. |
| DOMAIN | `NEXT_PUBLIC_SITE_URL` equals `https://precocaindo.com.br` | Never true until an actual deploy happens — this sprint explicitly does not deploy. |

## Admin security

`ADMIN_ACCESS_TOKEN` is a shared secret compared via `===` in `app/admin/page.tsx` — acceptable
for local development, **not** a production authentication system. It doesn't rate-limit
attempts, doesn't rotate, and isn't tied to an identity. Before `/admin` is ever exposed on a real
domain, replace this with real authentication (session-based auth, an identity provider, or at
minimum a properly rate-limited, hashed-comparison secret). Until then, `production:readiness`
reports `ADMIN SECURITY` as blocking even when a token is set, because a shared secret alone is
not what "production readiness" should mean for an admin surface with access to click/pageview
data.

## Why this isn't in CI

`production:readiness` is a standalone command, not part of `.github/workflows/ci.yml`. CI's job
is "does the code work" (lint/typecheck/test/build); this script's job is "is *this specific
deployment's configuration* ready to go live", which is expected to be `NOT READY` for a long
time during normal development. Wiring it into CI would make every PR red until the business has
finished onboarding with Amazon — that's not a useful signal.

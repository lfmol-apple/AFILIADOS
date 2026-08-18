# Analytics (first-party)

PreçoCaindo runs its own minimal analytics — no Google Analytics, no third-party pixel, nothing
that leaves the site. Two tables, both privacy-minimized by construction.

## `PageView`

Records `pageType`, `pageSlug`, an optional `productId`, `referrerDomain` (hostname only — never
the full referring URL, which could carry a query string), UTM parameters, and a pseudonymous
`sessionId`. **No IP address is ever read or stored anywhere in this path.**

Recorded by `components/analytics-beacon.tsx`, a client component mounted on the home, product,
category, and ofertas pages. It only fires when the visitor has granted **ANALYTICS** consent
(`lib/privacy/consent-client.ts` → `readCachedConsent()`) — refusing analytics consent means this
beacon simply never calls `/api/analytics/pageview` (project brief Part M/K).

The `sessionId` is the same pseudonymous, client-generated cookie value used for consent
(`pc_subject`) — not a persistent cross-site identifier, not tied to an email or account, and
never sent to a third party.

## `SearchEvent`

Records `query`, `normalizedQuery`, `resultCount`, and an optional `clickedProductId` — no IP,
no session identifier at all. Recorded server-side directly in `/ofertas` whenever a search
query is present (`lib/analytics/search-event.ts`).

**Why this isn't gated behind ANALYTICS consent** the way `PageView` is: it's server-side only,
carries no persistent identifier, and is core operational data for the product itself (it feeds
`DemandEngine` and surfaces catalog gaps — see docs/DEMAND_ENGINE.md), not third-party audience
tracking. This is a judgment call, documented here so it can be revisited if the distinction
stops feeling right in practice.

## `AffiliateClick`

Unchanged from the original design (docs/AMAZON_COMPLIANCE.md) — always recorded, no consent
gate, because it's core transaction/attribution data for the affiliate relationship itself, not
behavioral analytics. No IP stored.

## What we can measure today

- Pageviews, searches, and clicks per day (`/admin` → Visão geral).
- CTR = clicks / pageviews for the day (a rough site-wide number, not per-page attribution).
- Top products/pages by click (7 days).
- Search terms and zero-result searches (via `InternalDemandSource`).

## What we do not do

- No IP storage, anywhere.
- No fingerprinting (canvas, audio, font enumeration — none of it).
- No inferring an Amazon purchase from a click. A click is a click
  (`AffiliateClick`); a qualified purchase would require an actual sales report from Amazon,
  which doesn't exist in this system yet (project brief section 67/Part K).

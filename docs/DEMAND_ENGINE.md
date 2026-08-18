# Demand Engine

## Why this exists

The old `DISCOVER_CONTENT_OPPORTUNITIES` job queued a page for every product that didn't have one
yet, prioritized only by Opportunity Score. That answers "is this product a good deal?" but not
"does anyone actually want to read about it?" — publishing a page just because a product exists
is exactly what project brief Part F forbids ("Nunca publicar porque 'temos um ASIN'"). The
Demand Engine (`lib/demand/`) exists to add that second question.

## Never invented: search volume

`DemandSignal.observedCount` is always a real, counted number from a real source — internal
search events, manually curated seed keywords (with `observedCount: 0`, explicitly not a
volume), or a future integration. There is no code path that estimates or interpolates a search
volume. When there's no real observation, `evaluateDemand()`
(`lib/demand/scoring.ts`) returns `demandScore: null` — never a fabricated number, never a "10.000
buscas/mês" claim without a source (project brief Part C).

## Sources (`lib/demand/sources/`)

| Source | Real signal |
| --- | --- |
| `InternalDemandSource` | PreçoCaindo's own internal search (`SearchEvent`), grouped by normalized query over the last 30 days. |
| `ManualSeedDemandSource` | Editorially curated keywords from `lib/config/discovery.ts`, used to bootstrap before there's real traffic. `observedCount` is always 0 — these are not observed demand. |

Two adapters are explicitly *not* implemented yet, on purpose: Google Search Console and Google
Trends. Both would be legitimate future `DemandSource` implementations; neither is built because
neither integration exists today (project brief Part D — no scraping Google, no inventing an API
we don't have access to).

## Scoring (`lib/demand/scoring.ts`)

`evaluateDemand()` produces four independent 0-100 (or null) sub-scores and one `overallScore`:

- `demandScore` — from real observed volume (`log10` scale), null with zero observations.
- `commercialScore` — the related product's Opportunity Score, when there is one.
- `freshnessScore` — how much real price history backs the topic.
- `contentGapScore` — 100 if nothing is published on this yet, 0 if it's already covered.

`overallScore` averages only the sub-scores that have real evidence — a brand-new product with no
search history yet isn't punished for a `demandScore` of null; it's just evaluated on what's
actually known.

## What consumes this

- `DISCOVER_CONTENT_OPPORTUNITIES` scores each product candidate and stores the breakdown on
  `SearchOpportunity` (`demandScore`, `commercialScore`, `freshnessScore`, `contentGapScore`,
  `overallScore`), instead of just an Opportunity-Score-derived `priority`.
- `PublicationDecisionEngine` (`lib/services/publication-decision.ts`, see project brief Part F)
  uses `overallScore` as one input to decide `CREATE` / `NOINDEX` / `REJECT` — low demand doesn't
  reject a page outright, but it does keep it out of the sitemap until there's real evidence
  anyone is looking for it.

## Internal search as a signal

`/ofertas?q=...` records a `SearchEvent` for every search (`lib/analytics/search-event.ts`) — no
IP, no personal data. `InternalDemandSource.collectZeroResultQueries()` also surfaces searches
that consistently return nothing, a signal worth investigating for catalog gaps even though it
isn't wired into automatic content generation yet (project brief Part E).

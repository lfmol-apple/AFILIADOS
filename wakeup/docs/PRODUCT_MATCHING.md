# Product Matching

See docs/MONETIZATION_SCORE.md's "ProductMatcher — por que é estratégico" for the why. This doc
covers the mechanics and the schema.

## `lib/services/product-matcher.ts`

Pure function `matchListings(a, b): MatchResult | null`. No Prisma, no network, no LLM — takes two
`MatchableListing`-shaped plain objects (`id`, `title`, `brand?`, `model?`, `gtin?`,
`manufacturerId?`) and returns a decision or `null` if nothing meaningful was found.

| Method | Priority | Can return `CONFIRMED`? | Confidence |
| --- | --- | --- | --- |
| `GTIN` | 1 | Yes | 1.0 |
| `MANUFACTURER_ID` | 2 | Yes | 0.95 |
| `BRAND_MODEL` | 3 | No — always `CANDIDATE` | 0.75 |
| `TEXTUAL_CANDIDATE` | 4 | No — always `CANDIDATE` | `min(jaccardSimilarity, 0.6)` |

Textual similarity reuses `jaccardSimilarity` from `lib/services/similarity.ts` (3-word shingles,
already used for content-deduplication — no ML/LLM needed for this either, per project brief).
Threshold to even propose a `TEXTUAL_CANDIDATE`: `0.35`.

## Why `BRAND_MODEL` never auto-confirms

A normalized `"samsung" + "galaxy a54"` string collides across genuinely different products — a
128GB vs. 256GB variant, a bundle vs. a single unit, a different color SKU with its own GTIN. Only
an identifier that's actually unique in the real world (GTIN, manufacturer part number) is allowed
to confirm identity on its own.

## Persistence — `ProductMatchEvidence` (prisma/schema.prisma)

Every call site that wants an auditable trail writes the `MatchResult` here — `matchListings()`
itself never touches the database. A `CONFIRMED` row is the trigger for someone (a script, or
eventually a job) to actually set `MerchantListing.canonicalProductId`; `CANDIDATE`/`REJECTED`
rows exist purely as an audit trail and to stop the matcher from re-proposing the same pair.

No job or script currently calls `matchListings()` in a loop over real `MerchantListing` rows —
that's deliberately out of scope for this phase (project brief: "não publicar páginas em massa",
"não criar novos jobs"). This phase ships the decision function and its tests only.

# product-review-v1

Content type: PRODUCT
Used by: GENERATE_CONTENT job, /produto/[slug]

## Rule zero

Only use facts present in the `facts` payload. If a field is missing or
null, omit the sentence that would need it — never estimate, infer, or
invent a value (no fabricated specs, warranty, ratings, discounts, or
opinions). This rule overrides every instruction below.

## Goal

Answer, in this order: is the price good right now, and does this product
make sense for the reader? Ground every claim about price in
`facts.currentPrice`, `facts.lowestPrice`, `facts.highestPrice`,
`facts.avg30d`, `facts.coverageDays`, and `facts.opportunityScore` /
`facts.opportunityLabel`. Never say "lowest in N days" unless
`facts.coverageDays >= N`.

## Required sections (as Markdown ## headings)

1. `## O preço está bom?` — interpret price vs. avg30d/lowestPrice/highestPrice.
   If `coverageDays` is small, say so explicitly instead of implying a long
   track record.
2. `## Para quem faz sentido` — derived only from `facts.categoryName`,
   `facts.specifications`, and `facts.description` when present.
3. `## Pontos fortes` — derived only from `facts.specifications` /
   `facts.description`.
4. `## Pontos de atenção` — things the data does *not* confirm (e.g. no
   warranty info given) rather than invented downsides.
5. `## Metodologia` — one paragraph: score is PreçoCaindo's own, not
   Amazon's; based on price history collected by PreçoCaindo since first
   observation.

## Tone

Direct, concise, Brazilian Portuguese. No marketing hype ("imperdível",
"corra"). Treat the reader as someone deciding whether to spend money now.

## Output

title, metaTitle (<=70 chars), metaDescription (50-160 chars), body
(Markdown, matching the sections above).

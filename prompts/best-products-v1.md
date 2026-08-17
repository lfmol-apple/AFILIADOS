# best-products-v1

Content type: BEST_OF
Used by: GENERATE_CONTENT job, /melhores/[slug]

## Rule zero

Same as product-review-v1: only use facts present in `facts.items[]`. Never
invent a ranking criterion that isn't backed by data in the payload (price,
opportunity score, rating, review count).

## Goal

Help the reader pick among `facts.items[]` for the given
`facts.categoryName` / use case, using PreçoCaindo's own criteria — not an
Amazon recommendation.

## Required sections

1. `## Como escolhemos` — state the explicit criteria used (must match
   fields actually present on the items, e.g. opportunity score, rating).
2. One `##` subsection per item in `facts.items[]`, referencing only that
   item's own fields.
3. `## Metodologia` — same disclosure as product-review-v1.

## Output

title, metaTitle, metaDescription, body (Markdown).

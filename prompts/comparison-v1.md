# comparison-v1

Content type: COMPARISON
Used by: GENERATE_CONTENT job, /comparar/[slug]

## Rule zero

Only compare fields present on _both_ `facts.itemA` and `facts.itemB`. If
one item lacks a field the other has, omit that comparison line rather than
guessing a value to fill the gap.

## Required sections

1. `## Resumo` — one paragraph, which one currently has the better price
   opportunity per PreçoCaindo's score, and why.
2. `## Preço` — side-by-side using only `currentPrice` / `opportunityScore`
   for both items.
3. `## Especificações` — table built only from keys present in both items'
   `specifications`.
4. `## Qual escolher` — conditioned on explicit use cases only if derivable
   from `categoryName`/`specifications`; otherwise state the price-based
   recommendation only.
5. `## Metodologia`.

## Output

title, metaTitle, metaDescription, body (Markdown).

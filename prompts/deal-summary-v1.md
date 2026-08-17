# deal-summary-v1

Content type: DEAL_SUMMARY
Used by: GENERATE_CONTENT job (creatives, /ofertas highlights)

## Rule zero

Only use `facts.currentPrice`, `facts.previousPrice`, `facts.dropPercentage`,
and `facts.opportunityScore` if all required values for a claim are present.
Never state "de R$X por R$Y" unless both values have a legitimate,
permitted basis (project brief section 52).

## Goal

One short paragraph (2-4 sentences) summarizing why this specific price drop
is worth a look, for use in the homepage "Preços caindo agora" section and
Open Graph creatives.

## Output

title (<=60 chars, for creative headline), body (plain text, 2-4 sentences).

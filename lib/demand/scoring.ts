function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface DemandEvaluationInput {
  /** Total real observed count across all sources for this keyword. */
  observedCount: number;
  hasExistingPublishedContent: boolean;
  /** Product.opportunityScore.score (0-100), when this signal is tied to a
   * specific product. Null when there's no related product (e.g. a pure
   * category/informational keyword). */
  relatedOpportunityScore: number | null;
  /** PriceStats.coverageDays for the related product, when applicable. */
  dataCoverageDays: number | null;
}

export interface DemandEvaluationResult {
  /** Null when observedCount is 0 — there is no real evidence of demand,
   * and this must never be papered over with an invented number (project
   * brief: "Se não houver fonte de volume real: armazenar null"). */
  demandScore: number | null;
  commercialScore: number | null;
  freshnessScore: number | null;
  contentGapScore: number;
  overallScore: number;
}

/**
 * Deterministic demand scoring — no invented search volume, no LLM. Each
 * sub-score is 0-100 or null; `overallScore` averages only the sub-scores
 * that actually have evidence, so a keyword with no real search signal yet
 * isn't unfairly zeroed out just because that one input is missing.
 */
export function evaluateDemand(
  input: DemandEvaluationInput,
): DemandEvaluationResult {
  const demandScore =
    input.observedCount > 0
      ? round2(clamp((Math.log10(input.observedCount + 1) / 2) * 100, 0, 100))
      : null;

  const commercialScore =
    input.relatedOpportunityScore === null
      ? null
      : clamp(input.relatedOpportunityScore, 0, 100);

  const freshnessScore =
    input.dataCoverageDays === null
      ? null
      : round2(clamp((input.dataCoverageDays / 30) * 100, 0, 100));

  const contentGapScore = input.hasExistingPublishedContent ? 0 : 100;

  const parts = [
    demandScore,
    commercialScore,
    freshnessScore,
    contentGapScore,
  ].filter((v): v is number => v !== null);
  const overallScore =
    parts.length > 0
      ? round2(parts.reduce((a, b) => a + b, 0) / parts.length)
      : 0;

  return {
    demandScore,
    commercialScore,
    freshnessScore,
    contentGapScore,
    overallScore,
  };
}

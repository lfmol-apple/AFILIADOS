import type { PooledCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/** Maps the real PooledCandidate (lib/services/vitrine-selection.ts) to
 * the analyst's evidence contract — a pure, lossless-for-the-fields-that-
 * matter projection, never adding anything PooledCandidate doesn't
 * already have. */
export function toAnalystEvidenceInput(candidate: PooledCandidate): AnalystEvidenceInput {
  return {
    merchantListingId: candidate.merchantListingId,
    title: candidate.title,
    brand: null,
    categoryId: candidate.categoryId,
    currentPriceBrl: candidate.currentPrice,
    salesEvidence: { type: candidate.salesEvidence.type, demandScore: candidate.salesEvidence.demandScore },
    commissionEvidence: {
      type: candidate.commissionEvidence.type,
      rate: candidate.commissionEvidence.rate,
      estimatedValueBrl: candidate.commissionEvidence.estimatedValueBrl,
      ageDays: candidate.commissionEvidence.ageDays,
      stale: candidate.commissionEvidence.stale,
    },
    priceCompetitiveness: {
      competitivenessScore: candidate.priceCompetitiveness.competitivenessScore,
      siblingOfferCount: candidate.priceCompetitiveness.siblingOfferCount,
      hasConfirmedPriceDrop: candidate.priceCompetitiveness.hasConfirmedPriceDrop,
    },
    qualitySignal: candidate.qualitySignal?.value ?? null,
    trendDirection: candidate.trendDirection,
    matchedEventName: candidate.matchedEvent?.event.name ?? null,
    corroborationSourceCount: candidate.corroboration.count,
    discoverySource: candidate.discoverySource,
  };
}

import {
  detectHighQualityOffer,
  detectPriceDrop,
  detectRankEvent,
} from "@/lib/services/radar";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

/**
 * Deterministic editorial/SEO policy deciding whether a Mercado Livre or
 * Shopee MerchantListing has earned an indexable public page — NOT a
 * commercial score. Distinct from lib/services/publication-decision.ts
 * (GeneratedContent/DemandEngine's decidePublication, an unrelated
 * subsystem for /melhores and /comparar with incompatible inputs) and from
 * lib/services/monetization-score.ts (an internal "is this worth our
 * traffic" score that must never influence what the public sees/indexes —
 * project brief rule, also enforced by lib/queries/unified-offers.ts's
 * nonCommissionSignal()). This gate never reads MonetizationScore.
 *
 * Pure function over already-assembled facts — no Prisma, mirrors the
 * style of lib/services/radar.ts so it stays trivially unit-testable.
 */

/** A page older than this is stale enough that it shouldn't stay
 * indexed — documented, not hidden, like every other Radar threshold. */
export const MAX_OBSERVATION_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PublicationGateResult {
  indexable: boolean;
  /** Populated when indexable=true — which real evidence justified it. */
  reasons: string[];
  /** Populated when indexable=false — what's missing. */
  missing: string[];
  /** Whether the commercial CTA (Ver oferta) may render — independent of
   * `indexable`: a page can exist and be visible without being indexed,
   * but a CTA never renders without an ACTIVE affiliate link. */
  ctaEligible: boolean;
}

export function evaluatePublicationGate(facts: MerchantListingFacts): PublicationGateResult {
  const missing: string[] = [];

  if (!facts.active) missing.push("Listing inativo");
  if (!facts.title || facts.title === facts.externalId) missing.push("Sem título real (apenas o ID técnico)");
  if (facts.currentPrice === null || facts.currentPrice <= 0) missing.push("Sem preço atual real e válido");

  const ctaEligible = facts.affiliateLinkStatus === "ACTIVE" && Boolean(facts.affiliateUrl);
  if (!ctaEligible) missing.push("AffiliateLinkRegistry não está ACTIVE (sem link comercial real)");

  const isRecentEnough =
    facts.lastObservedAt !== null && Date.now() - facts.lastObservedAt.getTime() <= MAX_OBSERVATION_AGE_MS;
  if (!isRecentEnough) missing.push("Nenhuma observação real recente (última observação ausente ou obsoleta)");

  const reasons: string[] = [];

  const priceDropEvent = detectPriceDrop(facts.merchantListingId, facts.priceHistory);
  if (priceDropEvent) reasons.push(`Queda de preço real: ${priceDropEvent.headline}`);
  else if (facts.priceHistory.length >= 2) reasons.push("Histórico real com 2 ou mais observações de preço");

  const rankEvent = detectRankEvent(facts.merchantListingId, {
    bestsellerRank: facts.bestsellerRank,
    trendRank: facts.trendRank,
    observedAt: facts.lastObservedAt ?? new Date(0),
  });
  if (rankEvent) reasons.push(`Demanda real: ${rankEvent.headline}`);

  const qualityEvent = detectHighQualityOffer(facts.merchantListingId, {
    offerQualityScore: facts.offerQualityScore ?? undefined,
    rating: facts.rating,
    sellerReputationLevel: facts.sellerReputationLevel,
    freeShipping: facts.freeShipping,
    condition: facts.condition,
    observedAt: facts.lastObservedAt ?? new Date(0),
  });
  if (qualityEvent) reasons.push(`Qualidade real: ${qualityEvent.headline}`);

  const hasSafeIdentity =
    facts.canonicalProductId !== null || (facts.brand !== null && facts.model !== null);
  if (hasSafeIdentity) reasons.push("Identidade real (marca/modelo ou CanonicalProduct seguro)");

  if (reasons.length === 0) {
    missing.push("Nenhum valor adicional real: sem histórico, sem demanda, sem qualidade, sem identidade");
  }

  const indexable = missing.length === 0;

  return {
    indexable,
    reasons: indexable ? reasons : [],
    missing: indexable ? [] : missing,
    ctaEligible,
  };
}

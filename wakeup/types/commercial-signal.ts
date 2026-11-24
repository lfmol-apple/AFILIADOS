// Commercial/demand signals for a listing — deliberately NOT a field on
// NormalizedOffer (types/commerce.ts). NormalizedOffer is the
// provider-agnostic price/availability shape the whole catalog pipeline
// depends on; forcing affiliate-commission concepts into it would leak
// monetization-only data into a type consumer-facing code also reads.
// CommercialSignal is monetization-layer only — see
// lib/services/monetization-score.ts.

/** How reliable is this specific value, not the signal as a whole — lets a
 * single MonetizationScore mix strong and weak evidence transparently
 * instead of averaging them into one misleading confidence number. */
export type EvidenceQuality =
  | "OBSERVED"
  | "DERIVED_FROM_OBSERVED"
  | "HISTORICAL_INTERNAL"
  | "UNKNOWN";

/** One real, sourced observation about a listing's commercial/demand
 * standing. Every field is optional — a source that doesn't provide a
 * given signal simply omits it, never a fabricated 0 (project brief:
 * "valores desconhecidos devem permanecer null"). Mirrors
 * MerchantListingSignal (prisma/schema.prisma) field-for-field; this is
 * the in-memory shape a DemandSource/provider produces before it's
 * persisted. */
export interface CommercialSignal {
  merchantListingId?: string;
  source: string;
  observedAt: Date;

  commissionRate?: number;
  estimatedCommissionAmount?: number;
  sellerExtraCommission?: number;
  soldQuantity?: number;
  trendRank?: number;
  bestsellerRank?: number;
  rating?: number;
  reviewCount?: number;

  /** The source payload that produced this signal — kept for audit and
   * future reprocessing, never parsed by anything downstream of scoring. */
  raw?: Record<string, unknown>;
}

/** Mirrors the Prisma MatchMethod enum — kept as a plain TS union here so
 * lib/services/product-matcher.ts stays a pure function with no Prisma
 * import. Priority order (project brief): GTIN/EAN first, then a
 * manufacturer/model identifier, then normalized brand+model, and textual
 * similarity only as a last-resort CANDIDATE, never a silent confirmation. */
export type MatchMethod =
  | "GTIN"
  | "MANUFACTURER_ID"
  | "BRAND_MODEL"
  | "TEXTUAL_CANDIDATE";

export type MatchStatus = "CANDIDATE" | "CONFIRMED" | "REJECTED";

/** The subset of a MerchantListing/CanonicalProduct's identifying fields
 * ProductMatcher needs — deliberately narrow so it can be unit-tested with
 * plain objects, no Prisma model required. */
export interface MatchableListing {
  id: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  gtin?: string | null;
  /** Manufacturer Part Number / manufacturer-assigned identifier, when a
   * source provides one — distinct from the marketplace's own externalId. */
  manufacturerId?: string | null;
}

export interface MatchEvidence {
  method: MatchMethod;
  /** What specifically was compared — e.g. the two GTIN values, or the
   * normalized brand/model tokens on each side, or the two titles and the
   * similarity score for a textual candidate. Always concrete, never a bare
   * "matched" boolean, so a human can audit the decision later. */
  detail: Record<string, unknown>;
}

/**
 * One ProductMatcher decision between two listings. `confidence` is 0-1.
 * Only GTIN and MANUFACTURER_ID methods may ever produce `status:
 * "CONFIRMED"` — BRAND_MODEL and TEXTUAL_CANDIDATE always come back as
 * "CANDIDATE" (project brief: "matching textual isolado nunca deve
 * produzir associação definitiva silenciosa" — extended here to
 * brand+model too, since normalized brand/model strings can still collide
 * across genuinely different products, e.g. bundle vs. single unit).
 */
export interface MatchResult {
  listingAId: string;
  listingBId: string;
  method: MatchMethod;
  confidence: number;
  status: MatchStatus;
  evidence: MatchEvidence;
}

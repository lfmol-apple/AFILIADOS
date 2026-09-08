import { jaccardSimilarity } from "./similarity";
import { gtinsMatch, normalizeGtin } from "./gtin";
import { detectVariantConflict } from "./product-variant-guard";
import type {
  MatchableListing,
  MatchEvidence,
  MatchResult,
} from "@/types/product-match";

/** Bumped whenever the matching rules themselves change (project brief:
 * "distinguir match produzido pela regra antiga de match produzido pela
 * regra nova"). Persisted inside every MatchEvidence.detail — no schema
 * migration needed, ProductMatchEvidence.evidence is already a free-form
 * Json column. v1: GTIN (real check-digit validated) / MANUFACTURER_ID ->
 * CONFIRMED; BRAND_MODEL / TEXTUAL_CANDIDATE -> CANDIDATE, both guarded
 * against storage/voltage/tier variant conflicts (lib/services/
 * product-variant-guard.ts). */
export const MATCHER_VERSION = "v1";

/**
 * Decides whether two listings (possibly from different merchants) represent
 * the same real-world product — the piece that will eventually let a demand
 * signal discovered on one marketplace point at an opportunity on another
 * (project brief: "Mercado Livre detectou demanda por X; encontre X na
 * Shopee e, depois, na Amazon"). Pure and deterministic — no LLM, no network
 * call, no Prisma import, fully unit-testable with plain objects.
 *
 * Priority (project brief): GTIN/EAN -> manufacturer id -> brand+model ->
 * textual candidate. Only the first two can ever return `status:
 * "CONFIRMED"` — a real-world identifier match is unambiguous. BRAND_MODEL
 * and TEXTUAL_CANDIDATE always return "CANDIDATE": normalized brand+model
 * strings can still collide across genuinely different products (a bundle
 * vs. a single unit, different storage/color variants sharing a model
 * name), so neither is allowed to silently confirm identity — a human or a
 * stronger signal must promote them. This function never writes to the
 * database; the caller decides what to do with a CONFIRMED vs CANDIDATE
 * result (see prisma/schema.prisma's ProductMatchEvidence).
 */
export function matchListings(
  a: MatchableListing,
  b: MatchableListing,
): MatchResult | null {
  if (a.id === b.id) return null;

  // GTIN: real GS1 check-digit validation (lib/services/gtin.ts) — an
  // equal-but-invalid "GTIN" (wrong length, bad check digit, not even
  // numeric) is never treated as a match. A validated real-world
  // identifier is unambiguous by definition, so this tier is never
  // subject to the variant guard below — a different capacity/voltage is
  // a genuinely different real GTIN, not a false positive to catch here.
  if (gtinsMatch(a.gtin, b.gtin)) {
    return buildResult(a, b, "GTIN", 1, "CONFIRMED", {
      matcherVersion: MATCHER_VERSION,
      method: "GTIN",
      detail: { gtinA: normalizeGtin(a.gtin), gtinB: normalizeGtin(b.gtin) },
    });
  }
  // A GTIN-shaped value that fails validation is recorded nowhere by
  // design — it simply falls through to the next tier, exactly as if it
  // were absent, per the same "never treat garbage as evidence" rule.

  const manufacturerMatch = compareNormalized(a.manufacturerId, b.manufacturerId);
  if (manufacturerMatch) {
    return buildResult(a, b, "MANUFACTURER_ID", 0.95, "CONFIRMED", {
      matcherVersion: MATCHER_VERSION,
      method: "MANUFACTURER_ID",
      detail: {
        manufacturerIdA: normalize(a.manufacturerId),
        manufacturerIdB: normalize(b.manufacturerId),
      },
    });
  }

  const variantConflict = detectVariantConflict(a.title, b.title);

  const brandModelMatch =
    compareNormalized(a.brand, b.brand) && compareNormalized(a.model, b.model);
  if (brandModelMatch && !variantConflict.conflict) {
    return buildResult(a, b, "BRAND_MODEL", 0.75, "CANDIDATE", {
      matcherVersion: MATCHER_VERSION,
      method: "BRAND_MODEL",
      detail: {
        brandA: normalize(a.brand),
        brandB: normalize(b.brand),
        modelA: normalize(a.model),
        modelB: normalize(b.model),
      },
    });
  }
  if (brandModelMatch && variantConflict.conflict) {
    // Same brand+model string, but the titles disagree on capacity/
    // voltage/tier — e.g. "Galaxy A17" 128GB vs 256GB, a real conflict
    // found in this app's own production data. Never a match at any
    // status, not even CANDIDATE (project brief: "se houver dúvida:
    // CANDIDATE ou nenhum match" — here there isn't doubt, there's a
    // concrete, extracted disagreement, so "nenhum match" is the honest
    // outcome, not a downgrade).
    return null;
  }

  const titleSimilarity = jaccardSimilarity(a.title, b.title);
  const TEXTUAL_CANDIDATE_THRESHOLD = 0.35;
  if (titleSimilarity >= TEXTUAL_CANDIDATE_THRESHOLD && !variantConflict.conflict) {
    return buildResult(
      a,
      b,
      "TEXTUAL_CANDIDATE",
      // The similarity score itself, capped below CONFIRMED-territory
      // confidence — textual-only evidence is inherently the weakest tier.
      Math.min(titleSimilarity, 0.6),
      "CANDIDATE",
      {
        matcherVersion: MATCHER_VERSION,
        method: "TEXTUAL_CANDIDATE",
        detail: { titleA: a.title, titleB: b.title, titleSimilarity },
      },
    );
  }

  return null;
}

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function compareNormalized(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const normA = normalize(a);
  const normB = normalize(b);
  return normA !== null && normB !== null && normA === normB;
}

function buildResult(
  a: MatchableListing,
  b: MatchableListing,
  method: MatchResult["method"],
  confidence: number,
  status: MatchResult["status"],
  evidence: MatchEvidence,
): MatchResult {
  return {
    listingAId: a.id,
    listingBId: b.id,
    method,
    confidence,
    status,
    evidence,
  };
}

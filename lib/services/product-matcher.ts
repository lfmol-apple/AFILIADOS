import { jaccardSimilarity } from "./similarity";
import type {
  MatchableListing,
  MatchEvidence,
  MatchResult,
} from "@/types/product-match";

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

  const gtinMatch = compareNormalized(a.gtin, b.gtin);
  if (gtinMatch) {
    return buildResult(a, b, "GTIN", 1, "CONFIRMED", {
      method: "GTIN",
      detail: { gtinA: normalize(a.gtin), gtinB: normalize(b.gtin) },
    });
  }

  const manufacturerMatch = compareNormalized(a.manufacturerId, b.manufacturerId);
  if (manufacturerMatch) {
    return buildResult(a, b, "MANUFACTURER_ID", 0.95, "CONFIRMED", {
      method: "MANUFACTURER_ID",
      detail: {
        manufacturerIdA: normalize(a.manufacturerId),
        manufacturerIdB: normalize(b.manufacturerId),
      },
    });
  }

  const brandModelMatch =
    compareNormalized(a.brand, b.brand) && compareNormalized(a.model, b.model);
  if (brandModelMatch) {
    return buildResult(a, b, "BRAND_MODEL", 0.75, "CANDIDATE", {
      method: "BRAND_MODEL",
      detail: {
        brandA: normalize(a.brand),
        brandB: normalize(b.brand),
        modelA: normalize(a.model),
        modelB: normalize(b.model),
      },
    });
  }

  const titleSimilarity = jaccardSimilarity(a.title, b.title);
  const TEXTUAL_CANDIDATE_THRESHOLD = 0.35;
  if (titleSimilarity >= TEXTUAL_CANDIDATE_THRESHOLD) {
    return buildResult(
      a,
      b,
      "TEXTUAL_CANDIDATE",
      // The similarity score itself, capped below CONFIRMED-territory
      // confidence — textual-only evidence is inherently the weakest tier.
      Math.min(titleSimilarity, 0.6),
      "CANDIDATE",
      {
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

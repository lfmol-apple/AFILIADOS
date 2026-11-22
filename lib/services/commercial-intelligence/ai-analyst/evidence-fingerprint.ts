import { createHash } from "node:crypto";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Deterministic fingerprint of the REAL evidence sent to the model —
 * owner's authorization, 2026-11-22, section 6: "reavaliação somente
 * quando houver mudança relevante." Two calls with the exact same
 * evidence always produce the exact same fingerprint (stable key order,
 * no timestamps) — a cache hit is provable, never a guess about whether
 * "enough" has changed.
 */
export function computeEvidenceFingerprint(input: AnalystEvidenceInput): string {
  const stable = {
    title: input.title,
    brand: input.brand,
    categoryId: input.categoryId,
    currentPriceBrl: input.currentPriceBrl,
    salesEvidence: input.salesEvidence,
    commissionEvidence: input.commissionEvidence,
    priceCompetitiveness: input.priceCompetitiveness,
    qualitySignal: input.qualitySignal,
    trendDirection: input.trendDirection,
    matchedEventName: input.matchedEventName,
    corroborationSourceCount: input.corroborationSourceCount,
    discoverySource: input.discoverySource,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

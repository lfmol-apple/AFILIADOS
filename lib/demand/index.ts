import { prisma } from "@/lib/db";
import { normalizeKeyword } from "./normalize";
import { evaluateDemand, type DemandEvaluationResult } from "./scoring";
import { InternalDemandSource } from "./sources/internal-demand-source";
import { ManualSeedDemandSource } from "./sources/manual-seed-demand-source";
import type { DemandSignal, DemandSource } from "./types";

export type { DemandSignal, DemandSource } from "./types";
export { evaluateDemand } from "./scoring";
export { normalizeKeyword } from "./normalize";
export { InternalDemandSource } from "./sources/internal-demand-source";
export { ManualSeedDemandSource } from "./sources/manual-seed-demand-source";

export interface DemandCandidate extends DemandEvaluationResult {
  keyword: string;
  normalizedKeyword: string;
  intent: DemandSignal["intent"];
  productId?: string;
  category?: string;
  observedCount: number;
  sources: string[];
}

const DEFAULT_SOURCES: DemandSource[] = [new InternalDemandSource(), new ManualSeedDemandSource()];

function mergeSignals(signals: DemandSignal[]): Map<string, DemandSignal & { sources: Set<string> }> {
  const merged = new Map<string, DemandSignal & { sources: Set<string> }>();

  for (const signal of signals) {
    const key = `${normalizeKeyword(signal.keyword)}::${signal.productId ?? ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.observedCount += signal.observedCount;
      existing.sources.add(signal.source);
    } else {
      merged.set(key, { ...signal, sources: new Set([signal.source]) });
    }
  }

  return merged;
}

/**
 * Collects demand signals from every configured DemandSource, merges
 * duplicates (same normalized keyword + product), and scores each with
 * evaluateDemand. This is read-only — it does not write SearchOpportunity
 * rows itself; DISCOVER_CONTENT_OPPORTUNITIES decides what to do with the
 * result (see docs/DEMAND_ENGINE.md).
 */
export async function collectDemandCandidates(
  sources: DemandSource[] = DEFAULT_SOURCES,
): Promise<DemandCandidate[]> {
  const allSignals = (await Promise.all(sources.map((s) => s.collect()))).flat();
  const merged = mergeSignals(allSignals);

  const candidates: DemandCandidate[] = [];

  for (const signal of merged.values()) {
    let relatedOpportunityScore: number | null = null;
    let dataCoverageDays: number | null = null;
    let hasExistingPublishedContent = false;

    if (signal.productId) {
      const product = await prisma.product.findUnique({
        where: { id: signal.productId },
        select: { opportunityScore: { select: { score: true } }, priceStats: { select: { coverageDays: true } } },
      });
      relatedOpportunityScore = product?.opportunityScore?.score ?? null;
      dataCoverageDays = product?.priceStats?.coverageDays ?? null;

      const existingContent = await prisma.generatedContent.findFirst({
        where: { entityId: signal.productId, status: "PUBLISHED" },
        select: { id: true },
      });
      hasExistingPublishedContent = existingContent !== null;
    }

    const evaluation = evaluateDemand({
      observedCount: signal.observedCount,
      hasExistingPublishedContent,
      relatedOpportunityScore,
      dataCoverageDays,
    });

    candidates.push({
      ...evaluation,
      keyword: signal.keyword,
      normalizedKeyword: normalizeKeyword(signal.keyword),
      intent: signal.intent,
      productId: signal.productId,
      category: signal.category,
      observedCount: signal.observedCount,
      sources: [...signal.sources],
    });
  }

  return candidates.sort((a, b) => b.overallScore - a.overallScore);
}

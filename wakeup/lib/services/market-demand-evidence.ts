export type RepeatedMarketDemandEvidence = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type MarketDemandEvidenceConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface MarketDemandObservation {
  productKey: string;
  title?: string | null;
  bestsellerRank?: number | null;
  observedAt: Date;
  categoryId?: string | null;
}

export interface MarketDemandEvidence {
  productKey: string;
  title: string | null;
  latestObservedBestsellerRank: number | null;
  bestObservedRank: number | null;
  totalBestsellerObservations: number;
  top3Observations: number;
  top10Observations: number;
  top20Observations: number;
  firstObservedAt: Date | null;
  lastObservedAt: Date | null;
  categoriesObserved: string[];
  repeatedEvidence: RepeatedMarketDemandEvidence;
  confidence: MarketDemandEvidenceConfidence;
  explanation: string;
}

export function calculateMarketDemandEvidence(
  observations: MarketDemandObservation[],
): MarketDemandEvidence | null {
  const rankedObservations = observations
    .filter((observation) => isPositiveBestsellerObservation(observation.bestsellerRank))
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());

  if (rankedObservations.length === 0) return null;

  const ranks = rankedObservations.map((observation) => observation.bestsellerRank as number);
  const latest = rankedObservations[rankedObservations.length - 1]!;
  const total = rankedObservations.length;
  const bestObservedRank = Math.min(...ranks);
  const top3Observations = ranks.filter((rank) => rank <= 3).length;
  const top10Observations = ranks.filter((rank) => rank <= 10).length;
  const top20Observations = ranks.filter((rank) => rank <= 20).length;

  return {
    productKey: latest.productKey,
    title: latest.title ?? firstNonEmptyTitle(rankedObservations),
    latestObservedBestsellerRank: latest.bestsellerRank!,
    bestObservedRank,
    totalBestsellerObservations: total,
    top3Observations,
    top10Observations,
    top20Observations,
    firstObservedAt: rankedObservations[0]!.observedAt,
    lastObservedAt: latest.observedAt,
    categoriesObserved: uniqueSortedCategories(rankedObservations),
    repeatedEvidence: classifyRepeatedEvidence(total),
    confidence: classifyMarketDemandConfidence(total),
    explanation: buildMarketDemandExplanation({
      total,
      latestRank: latest.bestsellerRank!,
      bestObservedRank,
      top3Observations,
      top10Observations,
      top20Observations,
    }),
  };
}

export function calculateMarketDemandEvidenceBatch(
  observations: MarketDemandObservation[],
): MarketDemandEvidence[] {
  const byProduct = new Map<string, MarketDemandObservation[]>();
  for (const observation of observations) {
    const existing = byProduct.get(observation.productKey) ?? [];
    existing.push(observation);
    byProduct.set(observation.productKey, existing);
  }

  return [...byProduct.values()]
    .map((group) => calculateMarketDemandEvidence(group))
    .filter((evidence): evidence is MarketDemandEvidence => evidence !== null);
}

export function compareMarketDemandEvidence(
  a: MarketDemandEvidence,
  b: MarketDemandEvidence,
): number {
  return (
    b.totalBestsellerObservations - a.totalBestsellerObservations ||
    b.top3Observations - a.top3Observations ||
    b.top10Observations - a.top10Observations ||
    (a.bestObservedRank ?? Number.MAX_SAFE_INTEGER) -
      (b.bestObservedRank ?? Number.MAX_SAFE_INTEGER) ||
    (b.lastObservedAt?.getTime() ?? 0) - (a.lastObservedAt?.getTime() ?? 0)
  );
}

export function compareLatestObservedRank(
  a: MarketDemandEvidence,
  b: MarketDemandEvidence,
): number {
  return (
    (a.latestObservedBestsellerRank ?? Number.MAX_SAFE_INTEGER) -
      (b.latestObservedBestsellerRank ?? Number.MAX_SAFE_INTEGER) ||
    compareMarketDemandEvidence(a, b)
  );
}

function classifyRepeatedEvidence(totalObservations: number): RepeatedMarketDemandEvidence {
  if (totalObservations <= 1) return "NONE";
  if (totalObservations === 2) return "LOW";
  if (totalObservations <= 4) return "MEDIUM";
  return "HIGH";
}

function classifyMarketDemandConfidence(totalObservations: number): MarketDemandEvidenceConfidence {
  if (totalObservations <= 1) return "LOW";
  if (totalObservations <= 4) return "MEDIUM";
  return "HIGH";
}

function buildMarketDemandExplanation(input: {
  total: number;
  latestRank: number;
  bestObservedRank: number;
  top3Observations: number;
  top10Observations: number;
  top20Observations: number;
}): string {
  if (input.total === 1) {
    return `Observado 1 vez nos destaques do Mercado Livre, na posição #${input.latestRank}. Evidência ainda insuficiente para confirmar persistência.`;
  }

  if (input.top3Observations >= 5) {
    return `Observado ${input.total} vezes; permaneceu entre os 3 primeiros em ${input.top3Observations} observações. Histórico consistente de demanda elevada.`;
  }

  if (input.top10Observations >= 5) {
    return `Observado ${input.total} vezes nos destaques do Mercado Livre; ${input.top10Observations} observações no Top 10 e melhor posição #${input.bestObservedRank}. Evidência recorrente forte.`;
  }

  if (input.top10Observations >= 2) {
    return `Observado ${input.total} vezes nos destaques do Mercado Livre; ${input.top10Observations} observações no Top 10 e melhor posição #${input.bestObservedRank}. Evidência recorrente moderada.`;
  }

  return `Observado ${input.total} vezes nos destaques do Mercado Livre, com melhor posição #${input.bestObservedRank}. Há recorrência, mas sem predominância no Top 10.`;
}

function isPositiveBestsellerObservation(rank: number | null | undefined): rank is number {
  return typeof rank === "number" && Number.isInteger(rank) && rank > 0;
}

function firstNonEmptyTitle(observations: MarketDemandObservation[]): string | null {
  return observations.find((observation) => observation.title)?.title ?? null;
}

function uniqueSortedCategories(observations: MarketDemandObservation[]): string[] {
  return [...new Set(observations.map((observation) => observation.categoryId).filter(isNonEmptyString))].sort();
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

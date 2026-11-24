import { describe, expect, it } from "vitest";
import {
  calculateMarketDemandEvidence,
  calculateMarketDemandEvidenceBatch,
  compareMarketDemandEvidence,
  compareLatestObservedRank,
  type MarketDemandObservation,
} from "@/lib/services/market-demand-evidence";

function observation(rank: number | null, day: number, categoryId = "MLB1051"): MarketDemandObservation {
  return {
    productKey: "produto-a",
    title: "Produto A",
    bestsellerRank: rank,
    observedAt: new Date(`2026-09-${String(day).padStart(2, "0")}T12:00:00.000Z`),
    categoryId,
  };
}

describe("calculateMarketDemandEvidence", () => {
  it("Caso A — #1 uma única vez", () => {
    const evidence = calculateMarketDemandEvidence([observation(1, 1)]);

    expect(evidence).not.toBeNull();
    expect(evidence!.bestObservedRank).toBe(1);
    expect(evidence!.latestObservedBestsellerRank).toBe(1);
    expect(evidence!.totalBestsellerObservations).toBe(1);
    expect(evidence!.top3Observations).toBe(1);
    expect(evidence!.top10Observations).toBe(1);
    expect(evidence!.top20Observations).toBe(1);
    expect(evidence!.repeatedEvidence).toBe("NONE");
    expect(evidence!.confidence).toBe("LOW");
    expect(evidence!.explanation).toContain("Evidência ainda insuficiente");
  });

  it("Caso B — Top 10 recorrente", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(8, 1),
      observation(6, 2),
      observation(9, 3),
      observation(7, 4),
    ]);

    expect(evidence!.bestObservedRank).toBe(6);
    expect(evidence!.latestObservedBestsellerRank).toBe(7);
    expect(evidence!.totalBestsellerObservations).toBe(4);
    expect(evidence!.top10Observations).toBe(4);
    expect(evidence!.repeatedEvidence).toBe("MEDIUM");
    expect(evidence!.confidence).toBe("MEDIUM");
    expect(evidence!.explanation).toContain("Evidência recorrente moderada");
  });

  it("Caso C — Top 3 persistente", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(2, 1),
      observation(3, 2),
      observation(1, 3),
      observation(2, 4),
      observation(2, 5),
      observation(1, 6),
    ]);

    expect(evidence!.bestObservedRank).toBe(1);
    expect(evidence!.top3Observations).toBe(6);
    expect(evidence!.top10Observations).toBe(6);
    expect(evidence!.repeatedEvidence).toBe("HIGH");
    expect(evidence!.confidence).toBe("HIGH");
    expect(evidence!.explanation).toContain("Histórico consistente");
  });

  it("Caso D — ranking médio recorrente", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(15, 1),
      observation(17, 2),
      observation(12, 3),
      observation(18, 4),
      observation(14, 5),
    ]);

    expect(evidence!.bestObservedRank).toBe(12);
    expect(evidence!.top3Observations).toBe(0);
    expect(evidence!.top10Observations).toBe(0);
    expect(evidence!.top20Observations).toBe(5);
    expect(evidence!.repeatedEvidence).toBe("HIGH");
    expect(evidence!.confidence).toBe("HIGH");
    expect(evidence!.explanation).toContain("sem predominância no Top 10");
  });

  it("Caso E — categorias diferentes deduplicadas", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(5, 1, "MLB1051"),
      observation(4, 2, "MLB1648"),
      observation(3, 3, "MLB1051"),
    ]);

    expect(evidence!.categoriesObserved).toEqual(["MLB1051", "MLB1648"]);
  });

  it("Caso F — ausência desconhecida não inventa queda nem rank", () => {
    const evidence = calculateMarketDemandEvidence([observation(4, 1), observation(5, 10)]);

    expect(evidence!.totalBestsellerObservations).toBe(2);
    expect(evidence!.latestObservedBestsellerRank).toBe(5);
    expect(evidence!.bestObservedRank).toBe(4);
    expect(evidence!.explanation).not.toContain("queda");
    expect(evidence!.explanation).not.toContain("saiu");
  });

  it("Caso G — signal sem bestsellerRank é ignorado", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(null, 1),
      observation(2, 2),
      observation(null, 3),
    ]);

    expect(evidence!.totalBestsellerObservations).toBe(1);
    expect(evidence!.latestObservedBestsellerRank).toBe(2);
    expect(evidence!.repeatedEvidence).toBe("NONE");
  });

  it("Caso H — input fora de ordem mantém datas e latest corretos", () => {
    const evidence = calculateMarketDemandEvidence([
      observation(7, 3),
      observation(1, 1),
      observation(4, 2),
    ]);

    expect(evidence!.firstObservedAt?.toISOString()).toBe("2026-09-01T12:00:00.000Z");
    expect(evidence!.lastObservedAt?.toISOString()).toBe("2026-09-03T12:00:00.000Z");
    expect(evidence!.latestObservedBestsellerRank).toBe(7);
    expect(evidence!.bestObservedRank).toBe(1);
  });

  it("retorna null quando não há observação positiva de bestseller", () => {
    expect(calculateMarketDemandEvidence([observation(null, 1)])).toBeNull();
  });
});

describe("calculateMarketDemandEvidenceBatch", () => {
  it("agrega por productKey sem misturar produtos", () => {
    const results = calculateMarketDemandEvidenceBatch([
      { ...observation(1, 1), productKey: "a", title: "A" },
      { ...observation(2, 2), productKey: "a", title: "A" },
      { ...observation(8, 1), productKey: "b", title: "B" },
    ]).sort((a, b) => a.productKey.localeCompare(b.productKey));

    expect(results).toHaveLength(2);
    expect(results[0]!.productKey).toBe("a");
    expect(results[0]!.totalBestsellerObservations).toBe(2);
    expect(results[1]!.productKey).toBe("b");
    expect(results[1]!.totalBestsellerObservations).toBe(1);
  });

  it("ordena evidência persistente separadamente do snapshot mais recente", () => {
    const persistent = calculateMarketDemandEvidence([
      { ...observation(3, 1), productKey: "persistent" },
      { ...observation(3, 2), productKey: "persistent" },
      { ...observation(3, 3), productKey: "persistent" },
      { ...observation(3, 4), productKey: "persistent" },
      { ...observation(3, 5), productKey: "persistent" },
    ])!;
    const snapshot = calculateMarketDemandEvidence([{ ...observation(1, 6), productKey: "snapshot" }])!;

    expect([persistent, snapshot].sort(compareMarketDemandEvidence)[0]!.productKey).toBe("persistent");
    expect([persistent, snapshot].sort(compareLatestObservedRank)[0]!.productKey).toBe("snapshot");
  });
});

import { describe, expect, it } from "vitest";
import { calculateDemandIntelligenceV2 } from "@/lib/services/demand-intelligence-v2";

const base = new Date("2026-09-18T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(base.getTime() - days * 24 * 60 * 60 * 1000);
}

function sequence(ranks: Array<number | null>) {
  return ranks.map((rank, index) => ({
    rank,
    observedAt: daysAgo(ranks.length - index - 1),
  }));
}

describe("Demand Intelligence V2 temporal behavior", () => {
  it("forte persistente: 2 → 2 → 1 → 2 → 1", () => {
    const result = calculateDemandIntelligenceV2(sequence([2, 2, 1, 2, 1]), base);

    expect(result.currentRank).toBe(1);
    expect(result.bestRank).toBe(1);
    expect(result.top10Share).toBe(1);
    expect(result.consecutiveTop10Cycles).toBe(5);
    expect(result.demandPersistence).toBeGreaterThanOrEqual(65);
    expect(result.demandScoreV2).toBeGreaterThanOrEqual(75);
    expect(result.confidence).toBe("MEDIUM");
  });

  it("explosão recente: 30 → 18 → 9 → 4 → 2", () => {
    const result = calculateDemandIntelligenceV2(sequence([30, 18, 9, 4, 2]), base);

    expect(result.currentRank).toBe(2);
    expect(result.demandMomentum).toBe("ACCELERATING");
    expect(result.rankVelocity).toBeGreaterThan(0);
    expect(result.breakdown.momentum).toBeGreaterThan(75);
    expect(result.demandScoreV2).toBeGreaterThanOrEqual(65);
  });

  it("falso positivo: 1 → ausência → ausência → ausência", () => {
    const result = calculateDemandIntelligenceV2(sequence([1, null, null, null]), base);

    expect(result.currentRank).toBeNull();
    expect(result.bestRank).toBe(1);
    expect(result.consecutiveRankedCycles).toBe(0);
    expect(result.confidence).toBe("LOW");
    expect(result.demandScoreV2).toBeLessThan(45);
  });

  it("queda: 1 → 3 → 8 → 17 → 29", () => {
    const result = calculateDemandIntelligenceV2(sequence([1, 3, 8, 17, 29]), base);

    expect(result.currentRank).toBe(29);
    expect(result.demandMomentum).toBe("DECELERATING");
    expect(result.rankVelocity).toBeLessThan(0);
    expect(result.breakdown.momentum).toBeLessThan(35);
    expect(result.demandScoreV2).toBeLessThan(65);
  });

  it("estável médio: 8 → 9 → 7 → 8 → 8", () => {
    const result = calculateDemandIntelligenceV2(sequence([8, 9, 7, 8, 8]), base);

    expect(result.currentRank).toBe(8);
    expect(result.demandMomentum).toBe("STABLE");
    expect(result.top10Share).toBe(1);
    expect(result.demandPersistence).toBeGreaterThanOrEqual(60);
  });

  it("pouco histórico: 1", () => {
    const result = calculateDemandIntelligenceV2(sequence([1]), base);

    expect(result.currentRank).toBe(1);
    expect(result.confidence).toBe("LOW");
    expect(result.demandMomentum).toBe("UNKNOWN");
    expect(result.demandScoreV2).toBeLessThan(75);
  });
});

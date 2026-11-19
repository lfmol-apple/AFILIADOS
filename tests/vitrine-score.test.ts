import { describe, expect, it } from "vitest";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import { officialRankEvidence, searchRelevanceOnly } from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import type { MonetizationScoreComponents } from "@/types/monetization";

const qualitySignal: MonetizationScoreComponents["offerQuality"] = {
  value: 90,
  quality: "OBSERVED",
  detail: "q",
};

describe("calculateVitrineScore", () => {
  it("never fabricates a component with no evidence — score is 0 and confidence is 0 with nothing at all", () => {
    const result = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.components.priceCompetitiveness.value).toBeNull();
  });

  it("owner's correction, 2026-11-19: a search-result position never contributes to the score (demandScore is null by construction)", () => {
    const fromSearch = searchRelevanceOnly("black friday", 1);
    expect(fromSearch.demandScore).toBeNull();
    const result = calculateVitrineScore({
      salesEvidence: fromSearch,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.components.salesEvidence.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("a real official bestseller rank DOES contribute (never confused with search relevance)", () => {
    const fromRank = officialRankEvidence(1);
    expect(fromRank.demandScore).toBe(100);
    const result = calculateVitrineScore({
      salesEvidence: fromRank,
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.components.salesEvidence.value).toBe(100);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("owner's correction, 2026-11-19: commission is scored by REAIS value, not raw percentage — a R$500@10% product scores higher than a R$50@30% one", () => {
    const expensive = evaluateCommissionEvidence({
      individualRate: 0.1,
      individualCapturedAt: new Date(),
      mlCategoryId: null,
      currentPrice: 500,
    });
    const cheap = evaluateCommissionEvidence({
      individualRate: 0.3,
      individualCapturedAt: new Date(),
      mlCategoryId: null,
      currentPrice: 50,
    });
    expect(expensive.estimatedValueBrl).toBe(50);
    expect(cheap.estimatedValueBrl).toBe(15);

    const scoreExpensive = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: expensive,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const scoreCheap = calculateVitrineScore({
      salesEvidence: null,
      commissionEvidence: cheap,
      priceCompetitiveness: null,
      qualitySignal: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(scoreExpensive.components.commissionValue.value!).toBeGreaterThan(
      scoreCheap.components.commissionValue.value!,
    );
  });

  it("never saturates two different real commission rates to the same score (owner's correction: 25% and 52% must differ)", () => {
    const low = evaluateCommissionEvidence({ individualRate: 0.25, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 });
    const high = evaluateCommissionEvidence({ individualRate: 0.52, individualCapturedAt: new Date(), mlCategoryId: null, currentPrice: 100 });
    const scoreLow = calculateVitrineScore({ salesEvidence: null, commissionEvidence: low, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    const scoreHigh = calculateVitrineScore({ salesEvidence: null, commissionEvidence: high, priceCompetitiveness: null, qualitySignal: null, seasonalEvent: null, trendDirection: null, vitrineClickCount: 0 });
    expect(scoreHigh.components.commissionValue.value).not.toBe(scoreLow.components.commissionValue.value);
  });

  it("a stale individual commission observation is flagged, never treated as silently current", () => {
    const old = new Date(Date.now() - 60 * 86_400_000); // 60 days ago
    const evidence = evaluateCommissionEvidence({ individualRate: 0.3, individualCapturedAt: old, mlCategoryId: null, currentPrice: 100 });
    expect(evidence.stale).toBe(true);
    expect(evidence.type).toBe("historical");
  });

  it("rankingScore is always <= score, and strictly lower when confidence is incomplete", () => {
    const partial = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(partial.confidence).toBeLessThan(1);
    expect(partial.rankingScore).toBeLessThan(partial.score);
    expect(partial.rankingScore).toBe(Math.round(partial.score * partial.confidence));
  });

  it("flags a missing commission signal explicitly in reasons, never silently", () => {
    const result = calculateVitrineScore({
      salesEvidence: officialRankEvidence(1),
      commissionEvidence: null,
      priceCompetitiveness: null,
      qualitySignal,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.reasons.some((r) => r.startsWith("comissão: SEM EVIDÊNCIA"))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { evaluateDemand } from "@/lib/demand/scoring";
import { normalizeKeyword } from "@/lib/demand/normalize";

describe("evaluateDemand", () => {
  it("returns a null demandScore when there is no observed volume (never fabricates a number)", () => {
    const result = evaluateDemand({
      observedCount: 0,
      hasExistingPublishedContent: false,
      relatedOpportunityScore: null,
      dataCoverageDays: null,
    });
    expect(result.demandScore).toBeNull();
  });

  it("returns a positive demandScore once there is real observed volume", () => {
    const result = evaluateDemand({
      observedCount: 50,
      hasExistingPublishedContent: false,
      relatedOpportunityScore: null,
      dataCoverageDays: null,
    });
    expect(result.demandScore).not.toBeNull();
    expect(result.demandScore!).toBeGreaterThan(0);
  });

  it("does not zero out overallScore just because one sub-score is unavailable", () => {
    const withMissingSignals = evaluateDemand({
      observedCount: 0,
      hasExistingPublishedContent: false,
      relatedOpportunityScore: 80,
      dataCoverageDays: null,
    });
    // Average of commercialScore(80) and contentGapScore(100), demand/freshness excluded.
    expect(withMissingSignals.overallScore).toBeCloseTo(90, 0);
  });

  it("scores a content gap (no existing published content) higher than a covered topic", () => {
    const gap = evaluateDemand({
      observedCount: 10,
      hasExistingPublishedContent: false,
      relatedOpportunityScore: 50,
      dataCoverageDays: 30,
    });
    const covered = evaluateDemand({
      observedCount: 10,
      hasExistingPublishedContent: true,
      relatedOpportunityScore: 50,
      dataCoverageDays: 30,
    });
    expect(gap.overallScore).toBeGreaterThan(covered.overallScore);
  });

  it("keeps every sub-score within 0-100", () => {
    const result = evaluateDemand({
      observedCount: 1_000_000,
      hasExistingPublishedContent: false,
      relatedOpportunityScore: 100,
      dataCoverageDays: 10_000,
    });
    for (const value of [
      result.demandScore,
      result.commercialScore,
      result.freshnessScore,
      result.overallScore,
    ]) {
      expect(value).not.toBeNull();
      expect(value!).toBeLessThanOrEqual(100);
      expect(value!).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("normalizeKeyword", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeKeyword("  Fone   Bluetooth  ")).toBe("fone bluetooth");
  });

  it("removes accents so equivalent queries group together", () => {
    expect(normalizeKeyword("Cafeteira Elétrica")).toBe("cafeteira eletrica");
  });
});

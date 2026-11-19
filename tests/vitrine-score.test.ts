import { describe, expect, it } from "vitest";
import { calculateVitrineScore } from "@/lib/services/vitrine-score";
import type { MonetizationScoreComponents } from "@/types/monetization";

const fullMonetization: MonetizationScoreComponents = {
  demand: { value: 80, quality: "OBSERVED", detail: "d" },
  commission: { value: 60, quality: "OBSERVED", detail: "c" },
  trend: { value: 50, quality: "OBSERVED", detail: "t" },
  historicalConversion: { value: null, quality: "UNKNOWN", detail: "h" },
  offerQuality: { value: 90, quality: "OBSERVED", detail: "q" },
};

describe("calculateVitrineScore", () => {
  it("never fabricates a component with no evidence — score is 0 and confidence is 0 with nothing at all", () => {
    const result = calculateVitrineScore({
      monetization: null,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.components.competitiveness.value).toBeNull();
  });

  it("renormalizes weights among only the components that have real evidence", () => {
    const partial = calculateVitrineScore({
      monetization: fullMonetization,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    // demand/commission/quality are present; seasonality/trend/adPerformance/
    // competitiveness are not — confidence must reflect that partial coverage.
    expect(partial.confidence).toBeGreaterThan(0);
    expect(partial.confidence).toBeLessThan(1);
    expect(partial.score).toBeGreaterThan(0);
  });

  it("increases confidence as more real dimensions are added", () => {
    const partial = calculateVitrineScore({
      monetization: fullMonetization,
      seasonalEvent: null,
      trendDirection: null,
      vitrineClickCount: 0,
    });
    const withClicks = calculateVitrineScore({
      monetization: fullMonetization,
      seasonalEvent: null,
      trendDirection: "rising",
      vitrineClickCount: 50,
    });
    expect(withClicks.confidence).toBeGreaterThan(partial.confidence);
  });

  it("never shows a fabricated competitiveness value (documented gap)", () => {
    const result = calculateVitrineScore({
      monetization: fullMonetization,
      seasonalEvent: null,
      trendDirection: "rising",
      vitrineClickCount: 10,
    });
    expect(result.components.competitiveness.value).toBeNull();
  });
});

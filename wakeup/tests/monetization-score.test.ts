import { describe, expect, it } from "vitest";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import type { MonetizationScoreInput } from "@/types/monetization";

const EMPTY_INPUT: MonetizationScoreInput = {
  demandSignal: null,
  commissionSignal: null,
  trendSignal: null,
  historicalConversionSignal: null,
  offerQualitySignal: null,
};

describe("calculateMonetizationScore", () => {
  it("returns score: null and confidence: 0 when there is no evidence at all", () => {
    const result = calculateMonetizationScore(EMPTY_INPUT);
    expect(result.score).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.missingSignals).toHaveLength(5);
  });

  it("never converts an UNKNOWN component's value to 0", () => {
    const result = calculateMonetizationScore(EMPTY_INPUT);
    for (const component of Object.values(result.components)) {
      expect(component.quality).toBe("UNKNOWN");
      expect(component.value).toBeNull();
    }
  });

  it("computes a score from the components that do have real evidence, ignoring the ones that don't", () => {
    const result = calculateMonetizationScore({
      ...EMPTY_INPUT,
      demandSignal: { value: 80, quality: "OBSERVED" },
      commissionSignal: { value: 60, quality: "OBSERVED" },
    });
    expect(result.score).toBe(70); // average of 80 and 60
    expect(result.missingSignals).toEqual(
      expect.arrayContaining(["trend", "historicalConversion", "offerQuality"]),
    );
    expect(result.missingSignals).toHaveLength(3);
  });

  it("confidence reflects both coverage and evidence quality, not just whether a score exists", () => {
    const allObserved = calculateMonetizationScore({
      demandSignal: { value: 50, quality: "OBSERVED" },
      commissionSignal: { value: 50, quality: "OBSERVED" },
      trendSignal: { value: 50, quality: "OBSERVED" },
      historicalConversionSignal: { value: 50, quality: "OBSERVED" },
      offerQualitySignal: { value: 50, quality: "OBSERVED" },
    });
    expect(allObserved.confidence).toBe(1);

    const allDerived = calculateMonetizationScore({
      demandSignal: { value: 50, quality: "DERIVED_FROM_OBSERVED" },
      commissionSignal: { value: 50, quality: "DERIVED_FROM_OBSERVED" },
      trendSignal: { value: 50, quality: "DERIVED_FROM_OBSERVED" },
      historicalConversionSignal: { value: 50, quality: "DERIVED_FROM_OBSERVED" },
      offerQualitySignal: { value: 50, quality: "DERIVED_FROM_OBSERVED" },
    });
    // Same score (50) as allObserved, but strictly lower confidence — this
    // is the whole point of separating score from confidence.
    expect(allDerived.score).toBe(allObserved.score);
    expect(allDerived.confidence).toBeLessThan(allObserved.confidence);
  });

  it("one HISTORICAL_INTERNAL signal alone still produces a non-null score with modest confidence", () => {
    const result = calculateMonetizationScore({
      ...EMPTY_INPUT,
      historicalConversionSignal: { value: 40, quality: "HISTORICAL_INTERNAL" },
    });
    expect(result.score).toBe(40);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("never reads or requires an OpportunityScore-shaped field — the two are structurally unrelated", () => {
    const result = calculateMonetizationScore(EMPTY_INPUT);
    expect(result).not.toHaveProperty("opportunityScore");
    expect(JSON.stringify(result)).not.toMatch(/opportunityScore/i);
  });

  it("reasons are human-readable strings, one per component, never a raw number alone", () => {
    const result = calculateMonetizationScore({
      ...EMPTY_INPUT,
      demandSignal: { value: 90, quality: "OBSERVED" },
    });
    expect(result.reasons).toHaveLength(5);
    for (const reason of result.reasons) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(5);
    }
  });
});

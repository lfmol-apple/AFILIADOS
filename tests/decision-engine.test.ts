import { describe, expect, it } from "vitest";
import { calculateDecision, labelForVerdict } from "@/lib/services/decision-engine";
import type { OpportunityScoreResult } from "@/lib/services/opportunity-score";
import type { PriceStatsResult } from "@/lib/services/price-stats";

/**
 * Proves the Decision Engine (project brief Sprint 7 section 2) answers a
 * genuinely different question from OpportunityScore, with its own output
 * shape (score|null, verdict enum, confidence bucket, structured reasons)
 * — never a fabricated score, never the same thing as the internal
 * ranking score used by <OpportunityBadge/> and the homepage listings.
 */

function stats(overrides: Partial<PriceStatsResult> = {}): PriceStatsResult {
  return {
    currentPrice: 100,
    lowestPrice: 90,
    highestPrice: 120,
    avg7d: 100,
    avg30d: 100,
    avg90d: 105,
    dropPercentage: 0,
    distanceFromLow: 0.5,
    historicalPosition: 0.5,
    dataPointCount: 10,
    coverageDays: 30,
    ...overrides,
  };
}

function opportunity(overrides: Partial<OpportunityScoreResult> = {}): OpportunityScoreResult {
  return {
    score: 70,
    priceScore: 70,
    discountScore: 0,
    popularityScore: 50,
    ratingScore: 50,
    historicalScore: 50,
    confidence: 0.8,
    label: "Bom momento para comprar",
    insufficientHistory: false,
    ...overrides,
  };
}

describe("calculateDecision — no verified price at all", () => {
  it("returns score null and verdict INSUFFICIENT_DATA when there is no offer", () => {
    const decision = calculateDecision({ hasOffer: false, stats: null, opportunity: null });
    expect(decision.score).toBeNull();
    expect(decision.verdict).toBe("INSUFFICIENT_DATA");
    expect(decision.confidence).toBe("LOW");
    expect(decision.reasons[0].code).toBe("NO_VERIFIED_PRICE");
  });
});

describe("calculateDecision — offer exists but history is too thin", () => {
  it("returns score null and verdict INSUFFICIENT_DATA, never a fabricated number", () => {
    const decision = calculateDecision({
      hasOffer: true,
      stats: stats({ dataPointCount: 1 }),
      opportunity: opportunity({ insufficientHistory: true }),
    });
    expect(decision.score).toBeNull();
    expect(decision.verdict).toBe("INSUFFICIENT_DATA");
    expect(decision.reasons[0].code).toBe("LIMITED_HISTORY");
  });
});

describe("calculateDecision — verdict bands, mirrored from a real OpportunityScoreResult", () => {
  it("score >= 80 -> BUY_NOW", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ score: 85 }) });
    expect(decision.verdict).toBe("BUY_NOW");
    expect(decision.score).toBe(85);
  });

  it("score >= 65 and < 80 -> GOOD_TIME", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ score: 70 }) });
    expect(decision.verdict).toBe("GOOD_TIME");
  });

  it("score >= 40 and < 65 -> NEUTRAL", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ score: 50 }) });
    expect(decision.verdict).toBe("NEUTRAL");
  });

  it("score < 40 -> WAIT", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ score: 20 }) });
    expect(decision.verdict).toBe("WAIT");
  });
});

describe("calculateDecision — confidence bucketing", () => {
  it("opportunity.confidence >= 0.66 -> HIGH", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ confidence: 0.9 }) });
    expect(decision.confidence).toBe("HIGH");
  });

  it("opportunity.confidence between 0.33 and 0.66 -> MEDIUM", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ confidence: 0.5 }) });
    expect(decision.confidence).toBe("MEDIUM");
  });

  it("opportunity.confidence < 0.33 -> LOW", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity({ confidence: 0.1 }) });
    expect(decision.confidence).toBe("LOW");
  });
});

describe("calculateDecision — structured reasons, never freeform/fabricated", () => {
  it("flags a price below the historical baseline", () => {
    const decision = calculateDecision({
      hasOffer: true,
      stats: stats({ dropPercentage: 15, distanceFromLow: 0.5 }),
      opportunity: opportunity(),
    });
    expect(decision.reasons.some((r) => r.code === "BELOW_BASELINE")).toBe(true);
  });

  it("flags a price above the historical baseline", () => {
    const decision = calculateDecision({
      hasOffer: true,
      stats: stats({ dropPercentage: -10, distanceFromLow: 0.5 }),
      opportunity: opportunity(),
    });
    expect(decision.reasons.some((r) => r.code === "ABOVE_BASELINE")).toBe(true);
  });

  it("flags proximity to the historic low", () => {
    const decision = calculateDecision({
      hasOffer: true,
      stats: stats({ distanceFromLow: 0.02 }),
      opportunity: opportunity(),
    });
    expect(decision.reasons.some((r) => r.code === "NEAR_HISTORIC_LOW")).toBe(true);
  });

  it("falls back to WITHIN_NORMAL_RANGE when nothing else stands out", () => {
    const decision = calculateDecision({
      hasOffer: true,
      stats: stats({ dropPercentage: 0, distanceFromLow: 0.5 }),
      opportunity: opportunity(),
    });
    expect(decision.reasons.map((r) => r.code)).toEqual(["WITHIN_NORMAL_RANGE"]);
  });
});

describe("labelForVerdict — single source of truth for verdict copy", () => {
  it("every verdict has a distinct, non-empty label", () => {
    const verdicts = ["BUY_NOW", "GOOD_TIME", "NEUTRAL", "WAIT", "INSUFFICIENT_DATA"] as const;
    const labels = verdicts.map(labelForVerdict);
    expect(new Set(labels).size).toBe(verdicts.length);
    for (const label of labels) expect(label.length).toBeGreaterThan(0);
  });
});

describe("Decision Engine output never collapses into OpportunityScore's own vocabulary", () => {
  it("DecisionResult has no 'label' or business sub-score fields — those belong to OpportunityScoreResult only", () => {
    const decision = calculateDecision({ hasOffer: true, stats: stats(), opportunity: opportunity() });
    expect(decision).not.toHaveProperty("label");
    expect(decision).not.toHaveProperty("priceScore");
    expect(decision).not.toHaveProperty("popularityScore");
  });
});

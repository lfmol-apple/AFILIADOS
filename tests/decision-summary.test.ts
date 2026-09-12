import { describe, expect, it } from "vitest";
import { buildDecisionSummary } from "@/lib/queries/public-product";
import type { RadarEvent } from "@/lib/services/radar";

function event(type: RadarEvent["type"], evidence: RadarEvent["evidence"] = {}): RadarEvent {
  return { type, merchantListingId: "x", occurredAt: new Date(), evidence, headline: "irrelevant for this test" };
}

describe("buildDecisionSummary", () => {
  it("returns a neutral, honest line when there is no real event yet — never fabricates a reason", () => {
    const summary = buildDecisionSummary([]);
    expect(summary).toMatch(/reunindo sinais/i);
    expect(summary).not.toMatch(/caiu|vendidos|avaliação|interesse/i);
  });

  it("uses the real drop percentage for PRICE_DROP — never a placeholder number", () => {
    const summary = buildDecisionSummary([event("PRICE_DROP", { dropPercent: 0.23 })]);
    expect(summary).toContain("23%");
    expect(summary).toMatch(/vale atenção/i);
  });

  it("prioritizes PRICE_DROP over HIGH_QUALITY_OFFER/BESTSELLER_ENTRY/TREND_ENTRY when several real events exist", () => {
    const summary = buildDecisionSummary([
      event("TREND_ENTRY", { rank: 3 }),
      event("HIGH_QUALITY_OFFER", { rating: 4.8 }),
      event("PRICE_DROP", { dropPercent: 0.1 }),
    ]);
    expect(summary).toContain("10%");
  });

  it("falls back to HIGH_QUALITY_OFFER wording when that's the strongest real signal", () => {
    const summary = buildDecisionSummary([event("TREND_ENTRY", { rank: 5 }), event("HIGH_QUALITY_OFFER", {})]);
    expect(summary).toMatch(/avaliação/i);
  });

  it("uses BESTSELLER_ENTRY wording when that's the only real signal", () => {
    const summary = buildDecisionSummary([event("BESTSELLER_ENTRY", { rank: 1 })]);
    expect(summary).toMatch(/mais vendidos/i);
  });

  it("uses TREND_ENTRY wording when that's the only real signal", () => {
    const summary = buildDecisionSummary([event("TREND_ENTRY", { rank: 4 })]);
    expect(summary).toMatch(/interesse/i);
  });
});

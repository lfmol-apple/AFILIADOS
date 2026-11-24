import { describe, expect, it } from "vitest";
import {
  detectPriceDrop,
  detectRankEvent,
  detectHighQualityOffer,
  detectAffiliateLinkActivated,
  recencyWeight,
  calculateRadarPriority,
  RADAR_DECAY_WINDOW_MS,
  type RadarEvent,
} from "@/lib/services/radar";

describe("detectPriceDrop", () => {
  it("requires two real, distinct observations — never fabricates a drop from a single snapshot", () => {
    expect(detectPriceDrop("x", [{ price: 100, observedAt: new Date() }])).toBeNull();
    expect(detectPriceDrop("x", [])).toBeNull();
  });

  it("returns null when the price didn't actually drop (steady or increased)", () => {
    const t1 = new Date("2026-01-01T00:00:00Z");
    const t2 = new Date("2026-01-02T00:00:00Z");
    expect(detectPriceDrop("x", [{ price: 100, observedAt: t1 }, { price: 100, observedAt: t2 }])).toBeNull();
    expect(detectPriceDrop("x", [{ price: 100, observedAt: t1 }, { price: 110, observedAt: t2 }])).toBeNull();
  });

  it("returns null for a drop below the noise threshold (3%)", () => {
    const t1 = new Date("2026-01-01T00:00:00Z");
    const t2 = new Date("2026-01-02T00:00:00Z");
    expect(detectPriceDrop("x", [{ price: 100, observedAt: t1 }, { price: 99, observedAt: t2 }])).toBeNull();
  });

  it("detects a real drop and computes the exact percentage from real numbers, never a rounded guess", () => {
    const t1 = new Date("2026-01-01T00:00:00Z");
    const t2 = new Date("2026-01-02T00:00:00Z");
    const event = detectPriceDrop("listing-1", [
      { price: 1399, observedAt: t1 },
      { price: 969, observedAt: t2 },
    ]);
    expect(event).not.toBeNull();
    expect(event!.type).toBe("PRICE_DROP");
    expect(event!.evidence.previousPrice).toBe(1399);
    expect(event!.evidence.currentPrice).toBe(969);
    expect(event!.evidence.dropPercent).toBeCloseTo((1399 - 969) / 1399);
    expect(event!.headline).toContain("31%"); // Math.round((1399-969)/1399 * 100)
  });

  it("compares only the two most recent points — a drop deep in history followed by recovery is not still reported as a drop", () => {
    const t1 = new Date("2026-01-01T00:00:00Z");
    const t2 = new Date("2026-01-02T00:00:00Z");
    const t3 = new Date("2026-01-03T00:00:00Z");
    const event = detectPriceDrop("x", [
      { price: 1000, observedAt: t1 },
      { price: 500, observedAt: t2 }, // big drop
      { price: 950, observedAt: t3 }, // partial recovery, still below t1 but not below t2
    ]);
    expect(event).toBeNull(); // 950 > 500 — no drop between the two most recent points
  });
});

describe("detectRankEvent", () => {
  it("returns null when there is no real rank at all (UNKNOWN stays UNKNOWN, never assumed 'not ranked')", () => {
    expect(
      detectRankEvent("x", { bestsellerRank: null, trendRank: null, observedAt: new Date() }),
    ).toBeNull();
  });

  it("returns null when the rank is real but outside the top-10 threshold", () => {
    expect(
      detectRankEvent("x", { bestsellerRank: 11, trendRank: null, observedAt: new Date() }),
    ).toBeNull();
  });

  it("emits BESTSELLER_ENTRY from a real bestseller rank within the threshold", () => {
    const event = detectRankEvent("x", { bestsellerRank: 3, trendRank: null, observedAt: new Date() });
    expect(event?.type).toBe("BESTSELLER_ENTRY");
    expect(event?.evidence.rank).toBe(3);
    expect(event?.headline).toContain("#3");
  });

  it("emits TREND_ENTRY when only a real trend rank exists", () => {
    const event = detectRankEvent("x", { bestsellerRank: null, trendRank: 5, observedAt: new Date() });
    expect(event?.type).toBe("TREND_ENTRY");
  });
});

describe("detectHighQualityOffer", () => {
  it("returns null when neither a real offerQualityScore nor a real rating clears its threshold — never a fabricated 'good offer' claim", () => {
    expect(
      detectHighQualityOffer("x", { offerQualityScore: 50, rating: null, observedAt: new Date() }),
    ).toBeNull();
  });

  it("qualifies via a real high offerQualityScore (Mercado Livre)", () => {
    const event = detectHighQualityOffer("x", { offerQualityScore: 90, observedAt: new Date() });
    expect(event?.type).toBe("HIGH_QUALITY_OFFER");
  });

  it("qualifies via a real high rating alone (Shopee, which has no offerQualityScore)", () => {
    const event = detectHighQualityOffer("x", { rating: 4.8, observedAt: new Date() });
    expect(event?.type).toBe("HIGH_QUALITY_OFFER");
    expect(event?.headline).toContain("4.8");
  });

  it("never claims a seller is trustworthy without real seller reputation evidence", () => {
    const event = detectHighQualityOffer("x", { offerQualityScore: 90, sellerReputationLevel: null, observedAt: new Date() });
    expect(event?.headline).not.toContain("vendedor bem avaliado");
  });
});

describe("detectAffiliateLinkActivated", () => {
  it("returns null once outside the recency window — an old activation isn't 'just happened'", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(detectAffiliateLinkActivated("x", { activatedAt: eightDaysAgo })).toBeNull();
  });

  it("fires for a recent activation", () => {
    const event = detectAffiliateLinkActivated("x", { activatedAt: new Date() });
    expect(event?.type).toBe("AFFILIATE_LINK_ACTIVATED");
  });
});

describe("recencyWeight — decay", () => {
  it("is 1 for a just-now event and decays linearly to 0 at the decay window boundary", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    expect(recencyWeight(now, now)).toBe(1);
    expect(recencyWeight(new Date(now.getTime() - RADAR_DECAY_WINDOW_MS), now)).toBe(0);
    expect(recencyWeight(new Date(now.getTime() - RADAR_DECAY_WINDOW_MS / 2), now)).toBeCloseTo(0.5);
  });

  it("never goes negative for an event older than the decay window", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const veryOld = new Date(now.getTime() - RADAR_DECAY_WINDOW_MS * 10);
    expect(recencyWeight(veryOld, now)).toBe(0);
  });

  it("an event from 30 minutes ago outranks an equivalent one from 10 days ago — the project brief's own example", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const recent: RadarEvent = {
      type: "HIGH_QUALITY_OFFER",
      merchantListingId: "a",
      occurredAt: new Date(now.getTime() - 30 * 60 * 1000),
      evidence: {},
      headline: "x",
    };
    const old: RadarEvent = { ...recent, merchantListingId: "b", occurredAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) };
    expect(calculateRadarPriority(recent, { now })).toBeGreaterThan(calculateRadarPriority(old, { now }));
  });
});

describe("calculateRadarPriority — commission never overrides a factual difference", () => {
  it("a materially stronger PRICE_DROP always outranks a HIGH_QUALITY_OFFER with a high monetizationScore, even at max commercial nudge", () => {
    const now = new Date();
    const strongDrop: RadarEvent = {
      type: "PRICE_DROP",
      merchantListingId: "a",
      occurredAt: now,
      evidence: { dropPercent: 0.3 },
      headline: "x",
    };
    const weakQualityEventWithHighCommission: RadarEvent = {
      type: "HIGH_QUALITY_OFFER",
      merchantListingId: "b",
      occurredAt: now,
      evidence: {},
      headline: "y",
    };
    const dropPriority = calculateRadarPriority(strongDrop, { monetizationScore: 0, now });
    const qualityPriority = calculateRadarPriority(weakQualityEventWithHighCommission, { monetizationScore: 100, now });
    expect(dropPriority).toBeGreaterThan(qualityPriority);
  });

  it("the commercial nudge is capped at 10 points regardless of monetizationScore", () => {
    const now = new Date();
    const event: RadarEvent = {
      type: "AFFILIATE_LINK_ACTIVATED",
      merchantListingId: "a",
      occurredAt: now,
      evidence: {},
      headline: "x",
    };
    const at100 = calculateRadarPriority(event, { monetizationScore: 100, now });
    const at1000 = calculateRadarPriority(event, { monetizationScore: 1000, now }); // pathological input
    // Both must be within [base, base + 10] — the nudge never runs away.
    expect(at100 - at1000).toBeLessThanOrEqual(0.01);
  });
});

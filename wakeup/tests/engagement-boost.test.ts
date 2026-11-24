import { describe, expect, it } from "vitest";
import {
  applyEngagementBoost,
  computeEngagementBoost,
} from "@/lib/queries/engagement-boost";

describe("computeEngagementBoost", () => {
  it("is zero below the minimum weighted signal — no boost from a single lucky click", () => {
    expect(computeEngagementBoost({ clicks: 0, views: 0 })).toBe(0);
    expect(computeEngagementBoost({ clicks: 0, views: 2 })).toBe(0);
    expect(computeEngagementBoost({ clicks: 1, views: 0 })).toBe(0); // weighted = 2, still under the floor
  });

  it("a click counts double a view", () => {
    // 1 click (weighted 2) + 1 view (weighted 1) = 3, right at the floor
    const oneClickOneView = computeEngagementBoost({ clicks: 1, views: 1 });
    expect(oneClickOneView).toBeGreaterThan(0);
    // 3 views alone (weighted 3) should score the same as 1 click + 1 view (also weighted 3)
    expect(computeEngagementBoost({ clicks: 0, views: 3 })).toBe(
      oneClickOneView,
    );
  });

  it("grows with real signal but never past the cap", () => {
    const small = computeEngagementBoost({ clicks: 2, views: 5 });
    const big = computeEngagementBoost({ clicks: 50, views: 200 });
    const huge = computeEngagementBoost({ clicks: 5000, views: 20000 });
    expect(big).toBeGreaterThan(small);
    expect(huge).toBe(big); // both already at the cap
    expect(huge).toBeLessThanOrEqual(25);
  });

  it("doubling the clicks never doubles the boost (log-scaled, not linear)", () => {
    const ten = computeEngagementBoost({ clicks: 10, views: 0 });
    const twenty = computeEngagementBoost({ clicks: 20, views: 0 });
    expect(twenty).toBeLessThan(ten * 2);
  });
});

describe("applyEngagementBoost", () => {
  const card = (id: string, opportunitySignal: number | null, extra = {}) => ({
    id,
    href: `/go/shopee/${id}`,
    opportunitySignal,
    ...extra,
  });

  it("adds the boost on top of opportunitySignal, never replaces it", () => {
    const signals = {
      clicksByCardId: new Map([["a", 10]]),
      viewsBySlug: new Map<string, number>(),
    };
    const [out] = applyEngagementBoost([card("a", 40)], signals);
    expect(out!.opportunitySignal).toBeGreaterThan(40);
  });

  it("leaves a card with no real signal completely untouched", () => {
    const signals = { clicksByCardId: new Map(), viewsBySlug: new Map() };
    const input = card("a", 40);
    const [out] = applyEngagementBoost([input], signals);
    expect(out).toBe(input); // same object, not even a new reference
  });

  it("treats a null opportunitySignal as 0 before adding the boost", () => {
    const signals = {
      clicksByCardId: new Map([["a", 10]]),
      viewsBySlug: new Map<string, number>(),
    };
    const [out] = applyEngagementBoost([card("a", null)], signals);
    expect(out!.opportunitySignal).toBe(
      computeEngagementBoost({ clicks: 10, views: 0 }),
    );
  });

  it("matches pageviews by the product's own /produto/[slug] path, detailHref first, href as fallback", () => {
    const signals = {
      clicksByCardId: new Map<string, number>(),
      viewsBySlug: new Map([
        ["escova-secadora", 20],
        ["fone-bluetooth", 8],
      ]),
    };
    const [ml, amazon] = applyEngagementBoost(
      [
        card("a", 30, {
          href: "/go/mercado-livre/a",
          detailHref: "/produto/escova-secadora",
        }),
        card("b", 30, { href: "/produto/fone-bluetooth" }), // Amazon: href IS the detail page
      ],
      signals,
    );
    expect(ml!.opportunitySignal).toBeGreaterThan(30);
    expect(amazon!.opportunitySignal).toBeGreaterThan(30);
  });

  it("a card whose href isn't a /produto/ page gets no pageview credit, even with real views recorded elsewhere", () => {
    const signals = {
      clicksByCardId: new Map<string, number>(),
      viewsBySlug: new Map([["whatever", 999]]),
    };
    const [out] = applyEngagementBoost([card("a", 30)], signals); // href is /go/shopee/a, no detailHref
    expect(out!.opportunitySignal).toBe(30);
  });
});

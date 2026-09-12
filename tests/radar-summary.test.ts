import { describe, expect, it } from "vitest";
import { summarizeRadarEvents } from "@/components/radar-summary";
import type { RadarFeedItem } from "@/lib/queries/radar-events";
import type { RadarEvent } from "@/lib/services/radar";

function feedItem(type: RadarEvent["type"]): RadarFeedItem {
  return {
    event: { type, merchantListingId: "x", occurredAt: new Date(), evidence: {}, headline: "h" },
    priority: 1,
    merchant: "SHOPEE",
    title: "Produto Teste",
    imageUrl: null,
    ctaHref: null,
  };
}

describe("summarizeRadarEvents", () => {
  it("returns an empty summary (Home renders nothing) when there are no real events", () => {
    expect(summarizeRadarEvents([])).toEqual([]);
  });

  it("counts real events per translated category, never listing individual products", () => {
    const entries = summarizeRadarEvents([
      feedItem("PRICE_DROP"),
      feedItem("PRICE_DROP"),
      feedItem("BESTSELLER_ENTRY"),
      feedItem("TREND_ENTRY"),
      feedItem("HIGH_QUALITY_OFFER"),
    ]);
    const byCategory = Object.fromEntries(entries.map((e) => [e.category, e.count]));
    expect(byCategory.PRICE_DROP).toBe(2);
    expect(byCategory.DEMAND).toBe(2); // BESTSELLER_ENTRY + TREND_ENTRY roll up together
    expect(byCategory.QUALITY).toBe(1);
  });

  it("never surfaces AFFILIATE_LINK_ACTIVATED — internal/business fact only, per project rule", () => {
    const entries = summarizeRadarEvents([feedItem("AFFILIATE_LINK_ACTIVATED")]);
    expect(entries).toEqual([]);
  });

  it("never mentions raw enum names or product titles in the rendered label", () => {
    const entries = summarizeRadarEvents([feedItem("PRICE_DROP")]);
    expect(entries[0]!.label).not.toMatch(/PRICE_DROP|Produto Teste/);
    expect(entries[0]!.label).toMatch(/preço/i);
  });

  it("pluralizes correctly for a single real event", () => {
    const entries = summarizeRadarEvents([feedItem("PRICE_DROP")]);
    expect(entries[0]!.label).toBe("1 preço caiu recentemente");
  });
});

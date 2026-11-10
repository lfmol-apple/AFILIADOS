import { describe, expect, it } from "vitest";
import {
  buildTelegramMessage,
  buildTelegramPostCandidate,
} from "@/lib/services/price-drop-digest";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

function baseFacts(overrides: Partial<MerchantListingFacts> = {}): MerchantListingFacts {
  return {
    merchantListingId: "listing-1",
    merchant: "MERCADO_LIVRE",
    externalId: "MLB123",
    active: true,
    title: "Fralda Descartável Pacote Grande",
    imageUrl: "https://example.com/img.jpg",
    brand: null,
    model: null,
    currentPrice: 49.9,
    priceHistory: [],
    rating: null,
    reviewCount: null,
    soldQuantity: null,
    bestsellerRank: null,
    trendRank: null,
    offerQualityScore: null,
    sellerReputationLevel: null,
    freeShipping: null,
    condition: null,
    lastObservedAt: new Date("2026-11-10T12:00:00Z"),
    canonicalProductId: null,
    affiliateLinkStatus: "ACTIVE",
    affiliateUrl: "https://example.com/real-affiliate-link",
    affiliateLinkUpdatedAt: new Date("2026-11-10T12:00:00Z"),
    productUrl: "https://mercadolivre.com.br/product/ext-1",
    categoryId: null,
    ...overrides,
  };
}

describe("buildTelegramPostCandidate", () => {
  it("no real price drop (steady or rising price) -> null, never a fabricated candidate", () => {
    const facts = baseFacts({
      priceHistory: [
        { price: 100, observedAt: new Date("2026-11-01") },
        { price: 100, observedAt: new Date("2026-11-10") },
      ],
    });
    expect(buildTelegramPostCandidate(facts)).toBeNull();
  });

  it("a real drop below the all-time low is flagged isAllTimeLow", () => {
    const facts = baseFacts({
      priceHistory: [
        { price: 100, observedAt: new Date("2026-09-01") },
        { price: 90, observedAt: new Date("2026-10-01") },
        { price: 70, observedAt: new Date("2026-11-10") },
      ],
    });
    const candidate = buildTelegramPostCandidate(facts);
    expect(candidate).not.toBeNull();
    expect(candidate!.isAllTimeLow).toBe(true);
    expect(candidate!.currentPrice).toBe(70);
    expect(candidate!.previousPrice).toBe(90);
  });

  it("a real drop that still isn't the cheapest it's ever been is NOT flagged isAllTimeLow — never an inflated claim", () => {
    const facts = baseFacts({
      priceHistory: [
        { price: 60, observedAt: new Date("2026-09-01") }, // the real all-time low
        { price: 100, observedAt: new Date("2026-10-01") },
        { price: 70, observedAt: new Date("2026-11-10") }, // real drop, but above 60
      ],
    });
    const candidate = buildTelegramPostCandidate(facts);
    expect(candidate).not.toBeNull();
    expect(candidate!.isAllTimeLow).toBe(false);
  });

  it("maps merchant to the /go/ route slug the site already uses", () => {
    const ml = buildTelegramPostCandidate(
      baseFacts({
        merchant: "MERCADO_LIVRE",
        priceHistory: [
          { price: 100, observedAt: new Date("2026-11-01") },
          { price: 80, observedAt: new Date("2026-11-10") },
        ],
      }),
    );
    expect(ml!.merchantSlug).toBe("mercado-livre");

    const shopee = buildTelegramPostCandidate(
      baseFacts({
        merchant: "SHOPEE",
        priceHistory: [
          { price: 100, observedAt: new Date("2026-11-01") },
          { price: 80, observedAt: new Date("2026-11-10") },
        ],
      }),
    );
    expect(shopee!.merchantSlug).toBe("shopee");
  });
});

describe("buildTelegramMessage", () => {
  it("links straight to the store via /go/, never to our own site — zero extra clicks is the point", () => {
    const candidate = buildTelegramPostCandidate(
      baseFacts({
        merchant: "MERCADO_LIVRE",
        externalId: "MLB999",
        priceHistory: [
          { price: 100, observedAt: new Date("2026-11-01") },
          { price: 80, observedAt: new Date("2026-11-10") },
        ],
      }),
    )!;
    const text = buildTelegramMessage(candidate, "https://precocaindo.com.br");
    expect(text).toContain("https://precocaindo.com.br/go/mercado-livre/MLB999");
    expect(text).toContain("precocaindo.com.br");
  });

  it("says 'nunca esteve tão barato' only when it's genuinely the all-time low", () => {
    const allTimeLow = buildTelegramPostCandidate(
      baseFacts({
        priceHistory: [
          { price: 100, observedAt: new Date("2026-09-01") },
          { price: 50, observedAt: new Date("2026-11-10") },
        ],
      }),
    )!;
    expect(buildTelegramMessage(allTimeLow, "https://precocaindo.com.br")).toContain(
      "menor preço já registrado",
    );

    const notAllTimeLow = buildTelegramPostCandidate(
      baseFacts({
        priceHistory: [
          { price: 60, observedAt: new Date("2026-09-01") },
          { price: 100, observedAt: new Date("2026-10-01") },
          { price: 70, observedAt: new Date("2026-11-10") },
        ],
      }),
    )!;
    const text = buildTelegramMessage(notAllTimeLow, "https://precocaindo.com.br");
    expect(text).not.toContain("menor preço já registrado");
    expect(text).toContain("Caiu");
  });
});

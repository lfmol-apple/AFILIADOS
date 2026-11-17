import { describe, expect, it } from "vitest";
import { evaluateAdsEligibility, MAX_AD_LINK_AGE_MS } from "@/lib/services/ads-eligibility";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

const NOW_MS = Date.now();
const RECENT = new Date(NOW_MS - 1000 * 60 * 60); // 1h ago
const STALE_LINK = new Date(NOW_MS - MAX_AD_LINK_AGE_MS - 1000);

function baseFacts(overrides: Partial<MerchantListingFacts> = {}): MerchantListingFacts {
  return {
    merchantListingId: "listing-1",
    merchant: "SHOPEE",
    externalId: "ext-1",
    active: true,
    title: "Fralda Descartável Pacote Grande",
    imageUrl: "https://example.com/img.jpg",
    brand: null,
    model: null,
    currentPrice: 49.9,
    priceHistory: [],
    referencePrice: null,
    discountPercent: null,
    rating: null,
    reviewCount: null,
    soldQuantity: null,
    bestsellerRank: null,
    trendRank: null,
    offerQualityScore: null,
    sellerReputationLevel: null,
    freeShipping: null,
    condition: null,
    lastObservedAt: RECENT,
    canonicalProductId: null,
    affiliateLinkStatus: "ACTIVE",
    affiliateUrl: "https://shope.ee/real-affiliate-link",
    affiliateLinkUpdatedAt: RECENT,
    productUrl: "https://shopee.com.br/product/ext-1",
    categoryId: null,
    ...overrides,
  };
}

const PRICE_HISTORY_WITH_REAL_DROP = [
  { price: 100, observedAt: new Date(NOW_MS - 1000 * 60 * 60 * 24 * 10) },
  { price: 70, observedAt: new Date(NOW_MS - 1000 * 60 * 60) },
];

describe("evaluateAdsEligibility", () => {
  it("elegível quando o gate passa, o link está fresco e há queda real", () => {
    const result = evaluateAdsEligibility(
      baseFacts({ priceHistory: PRICE_HISTORY_WITH_REAL_DROP, currentPrice: 70 }),
    );
    expect(result.eligible).toBe(true);
    expect(result.reasons.some((r) => r.includes("Promoção comprovada"))).toBe(true);
  });

  it("não elegível sem queda de preço real, mesmo com página publicável", () => {
    const result = evaluateAdsEligibility(baseFacts({ priceHistory: [] }));
    expect(result.eligible).toBe(false);
    expect(
      result.missing.some((m) => m.includes("Sem queda de preço comprovada")),
    ).toBe(true);
  });

  it("não elegível quando o link não foi revalidado nas últimas 24h", () => {
    const result = evaluateAdsEligibility(
      baseFacts({
        priceHistory: PRICE_HISTORY_WITH_REAL_DROP,
        currentPrice: 70,
        affiliateLinkUpdatedAt: STALE_LINK,
      }),
    );
    expect(result.eligible).toBe(false);
    expect(
      result.missing.some((m) => m.includes("não foi revalidado")),
    ).toBe(true);
  });

  it("não elegível quando o publication-gate já reprova (nunca ignora a régua editorial)", () => {
    const result = evaluateAdsEligibility(
      baseFacts({
        priceHistory: PRICE_HISTORY_WITH_REAL_DROP,
        currentPrice: null,
      }),
    );
    expect(result.eligible).toBe(false);
  });

  it("nunca fica elegível só por ter link ACTIVE sem queda real (comissão não compra elegibilidade)", () => {
    const result = evaluateAdsEligibility(
      baseFacts({
        priceHistory: [],
        affiliateLinkStatus: "ACTIVE",
        affiliateUrl: "https://shope.ee/real-affiliate-link",
      }),
    );
    expect(result.eligible).toBe(false);
  });
});

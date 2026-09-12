import { describe, expect, it } from "vitest";
import { evaluatePublicationGate, MAX_OBSERVATION_AGE_MS } from "@/lib/services/publication-gate";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

const NOW = new Date("2026-09-12T12:00:00Z");
const RECENT = new Date(NOW.getTime() - 1000 * 60 * 60); // 1h ago
const STALE = new Date(NOW.getTime() - MAX_OBSERVATION_AGE_MS - 1000);

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

describe("evaluatePublicationGate", () => {
  it("1. sem preço real e válido -> não indexável", () => {
    const result = evaluatePublicationGate(baseFacts({ currentPrice: null }));
    expect(result.indexable).toBe(false);
    expect(result.missing).toContain("Sem preço atual real e válido");

    const zero = evaluatePublicationGate(baseFacts({ currentPrice: 0 }));
    expect(zero.indexable).toBe(false);
  });

  it("2. listing inativo -> não indexável", () => {
    const result = evaluatePublicationGate(
      baseFacts({ active: false, priceHistory: [{ price: 10, observedAt: RECENT }, { price: 9, observedAt: RECENT }] }),
    );
    expect(result.indexable).toBe(false);
    expect(result.missing).toContain("Listing inativo");
  });

  it("3. sem nenhum valor adicional real -> não indexável, mesmo com título/preço/link/observação ok", () => {
    const result = evaluatePublicationGate(baseFacts());
    expect(result.indexable).toBe(false);
    expect(result.missing).toContain(
      "Nenhum valor adicional real: sem histórico, sem demanda, sem qualidade, sem identidade",
    );
  });

  it("4. histórico real com 2+ observações -> indexável", () => {
    const t1 = new Date(RECENT.getTime() - 1000 * 60 * 60 * 24);
    const result = evaluatePublicationGate(
      baseFacts({ priceHistory: [{ price: 50, observedAt: t1 }, { price: 49.9, observedAt: RECENT }] }),
    );
    expect(result.indexable).toBe(true);
    expect(result.reasons.some((r) => r.includes("Histórico real"))).toBe(true);
  });

  it("5. PRICE_DROP real -> indexável", () => {
    const t1 = new Date(RECENT.getTime() - 1000 * 60 * 60 * 24);
    const result = evaluatePublicationGate(
      baseFacts({
        currentPrice: 40,
        priceHistory: [{ price: 50, observedAt: t1 }, { price: 40, observedAt: RECENT }],
      }),
    );
    expect(result.indexable).toBe(true);
    expect(result.reasons.some((r) => r.includes("Queda de preço real"))).toBe(true);
  });

  it("6. demanda real (rank <= 10) -> indexável", () => {
    const result = evaluatePublicationGate(baseFacts({ bestsellerRank: 3 }));
    expect(result.indexable).toBe(true);
    expect(result.reasons.some((r) => r.includes("Demanda real"))).toBe(true);
  });

  it("7. qualidade real (rating >= 4.5) -> indexável", () => {
    const result = evaluatePublicationGate(baseFacts({ rating: 4.8 }));
    expect(result.indexable).toBe(true);
    expect(result.reasons.some((r) => r.includes("Qualidade real"))).toBe(true);
  });

  it("7b. identidade segura (brand+model, ou CanonicalProduct) também conta como valor adicional", () => {
    const byBrandModel = evaluatePublicationGate(baseFacts({ brand: "Samsung", model: "A17" }));
    expect(byBrandModel.indexable).toBe(true);

    const byCanonical = evaluatePublicationGate(baseFacts({ canonicalProductId: "canon-1" }));
    expect(byCanonical.indexable).toBe(true);
  });

  it("8. ctaEligible só é true com AffiliateLinkRegistry ACTIVE e affiliateUrl real", () => {
    const active = evaluatePublicationGate(baseFacts({ rating: 4.8 }));
    expect(active.ctaEligible).toBe(true);

    const pending = evaluatePublicationGate(baseFacts({ rating: 4.8, affiliateLinkStatus: "PENDING", affiliateUrl: null }));
    expect(pending.ctaEligible).toBe(false);

    const activeNoUrl = evaluatePublicationGate(baseFacts({ rating: 4.8, affiliateLinkStatus: "ACTIVE", affiliateUrl: null }));
    expect(activeNoUrl.ctaEligible).toBe(false);
  });

  it("9. link não ACTIVE -> sem CTA e não indexável mesmo com valor adicional real", () => {
    const result = evaluatePublicationGate(baseFacts({ rating: 4.8, affiliateLinkStatus: "DISABLED", affiliateUrl: null }));
    expect(result.ctaEligible).toBe(false);
    expect(result.indexable).toBe(false);
    expect(result.missing).toContain("AffiliateLinkRegistry não está ACTIVE (sem link comercial real)");
  });

  it("10. nenhuma queda inventada: um único ponto de preço nunca produz menção a queda", () => {
    const result = evaluatePublicationGate(baseFacts({ priceHistory: [{ price: 50, observedAt: RECENT }], rating: 4.8 }));
    expect(result.reasons.some((r) => r.toLowerCase().includes("queda"))).toBe(false);
  });

  it("11. nenhum rating inventado: rating null nunca produz razão de qualidade", () => {
    const result = evaluatePublicationGate(baseFacts({ rating: null, offerQualityScore: null, bestsellerRank: 1 }));
    expect(result.reasons.some((r) => r.includes("Qualidade real"))).toBe(false);
  });

  it("12. observação ausente ou obsoleta -> não indexável mesmo com tudo mais presente", () => {
    const noObservation = evaluatePublicationGate(baseFacts({ lastObservedAt: null, rating: 4.8 }));
    expect(noObservation.indexable).toBe(false);

    const stale = evaluatePublicationGate(baseFacts({ lastObservedAt: STALE, rating: 4.8 }));
    expect(stale.indexable).toBe(false);
    expect(stale.missing).toContain("Nenhuma observação real recente (última observação ausente ou obsoleta)");
  });
});

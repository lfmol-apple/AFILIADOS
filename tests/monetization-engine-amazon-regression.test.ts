import { describe, expect, it } from "vitest";
import { getCommerceProvider, MockAmazonProvider } from "@/lib/providers";
import { getMerchantConfig } from "@/lib/merchants/config";

/**
 * Explicit regression coverage (project brief: "garantia de que Amazon
 * continua funcionando") — none of the monetization-engine-phase files
 * (types, ProductMatcher, MonetizationScore, MercadoLivreProvider,
 * ShopeeProvider, demand sources) touch lib/providers/index.ts,
 * lib/providers/amazon-provider.ts, lib/config/marketplaces.ts, or
 * lib/merchants/config.ts's amazon entry — this test exists to prove that
 * claim, not just assert it in a commit message.
 */
describe("Amazon provider/merchant config — unaffected by the monetization engine phase", () => {
  it("getCommerceProvider('BR') still returns an Amazon-family provider, unchanged", () => {
    const provider = getCommerceProvider("BR");
    expect(provider).toBeInstanceOf(MockAmazonProvider);
    expect(provider.name).toBe("AMAZON");
    expect(provider.marketplace).toBe("BR");
  });

  it("the amazon merchant config is still 'live' and affiliateEnabled — unaffected by shopee going live too (2026-09-07)", () => {
    const amazon = getMerchantConfig("amazon");
    expect(amazon.status).toBe("live");
    expect(amazon.affiliateEnabled).toBe(true);

    // Mercado Livre stays "prepared" (human-assisted link flow, no
    // automated generation) — only Shopee's status legitimately changed,
    // once real Affiliate API credentials were confirmed working.
    const mercadoLivre = getMerchantConfig("mercado-livre");
    expect(mercadoLivre.status).toBe("prepared");
    expect(mercadoLivre.affiliateEnabled).toBe(false);
  });
});

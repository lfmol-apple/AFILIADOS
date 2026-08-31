import { afterEach, describe, expect, it, vi } from "vitest";

describe("merchant routing config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("recognizes prepared merchant codes without enabling fake integrations", async () => {
    const { isMerchantCode, getMerchantConfig } =
      await import("@/lib/merchants/config");
    expect(isMerchantCode("amazon")).toBe(true);
    expect(isMerchantCode("mercado-livre")).toBe(true);
    expect(isMerchantCode("unknown")).toBe(false);
    expect(getMerchantConfig("mercado-livre").status).toBe("prepared");
    expect(getMerchantConfig("mercado-livre").affiliateEnabled).toBe(false);
  });

  it("rejects destinations outside the merchant whitelist", async () => {
    const { assertAllowedMerchantDestination } =
      await import("@/lib/merchants/config");
    expect(() =>
      assertAllowedMerchantDestination(
        "https://example.com/dp/B0MOCK0001",
        "amazon",
      ),
    ).toThrow(/não autorizado/);
  });

  it("builds Amazon special links only when the configured tag exists", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { buildMerchantAffiliateUrl } =
      await import("@/lib/merchants/config");
    const url = buildMerchantAffiliateUrl({
      merchant: "amazon",
      externalId: "B0MOCK0001",
      marketplace: "BR",
    });
    expect(url).toContain("amazon.com.br");
    expect(url).toContain("tag=confirmed-preco-20");
  });

  it("fails closed for future merchants until a legitimate integration exists", async () => {
    const { buildMerchantAffiliateUrl } =
      await import("@/lib/merchants/config");
    expect(() =>
      buildMerchantAffiliateUrl({
        merchant: "shopee",
        externalId: "abc",
      }),
    ).toThrow(/ainda não possui integração/);
  });
});

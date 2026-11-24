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
    // mercado-livre itself went "live" 2026-09-08 (real human-generated
    // link confirmed working) — awin is still genuinely unimplemented,
    // so it's the one that still demonstrates "prepared, no fake
    // integration enabled".
    expect(getMerchantConfig("awin").status).toBe("prepared");
    expect(getMerchantConfig("awin").affiliateEnabled).toBe(false);
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

  it("mercado-livre accepts both the plain product host and the affiliate short-link hosts (.com/sec, .com.br/social)", async () => {
    const { assertAllowedMerchantDestination } =
      await import("@/lib/merchants/config");
    expect(() =>
      assertAllowedMerchantDestination(
        "https://www.mercadolivre.com.br/produto/p/MLB1",
        "mercado-livre",
      ),
    ).not.toThrow();
    expect(() =>
      assertAllowedMerchantDestination(
        "https://mercadolivre.com/sec/1AbCdEf",
        "mercado-livre",
      ),
    ).not.toThrow();
    expect(() =>
      assertAllowedMerchantDestination(
        "https://not-mercadolivre.example.com/sec/1AbCdEf",
        "mercado-livre",
      ),
    ).toThrow(/não autorizado/);
  });

  it("amazon's allowed hosts and live status are unaffected by the mercado-livre host list change", async () => {
    const { getMerchantConfig } = await import("@/lib/merchants/config");
    const amazon = getMerchantConfig("amazon");
    expect(amazon.status).toBe("live");
    expect(amazon.allowedHosts).toEqual([
      "amazon.com.br",
      "www.amazon.com.br",
      "amazon.com",
      "www.amazon.com",
    ]);
  });
});

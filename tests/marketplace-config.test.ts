import { describe, expect, it, vi, afterEach } from "vitest";

describe("marketplace config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("BR resolves to amazon.com.br / BRL", async () => {
    const { getAmazonMarketplaceConfig } =
      await import("@/lib/config/marketplaces");
    const config = getAmazonMarketplaceConfig("BR");
    expect(config.host).toBe("amazon.com.br");
    expect(config.currency).toBe("BRL");
  });

  it("BR uses precocaindo-20 as its associate tag when configured", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "precocaindo-20");
    const { getAmazonMarketplaceConfig } =
      await import("@/lib/config/marketplaces");
    expect(getAmazonMarketplaceConfig("BR").associateTag).toBe(
      "precocaindo-20",
    );
  });

  it("falls back to the deprecated AMAZON_ASSOCIATE_TAG for BR when the new var is unset", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "legacy-tag-20");
    const { getAmazonMarketplaceConfig } =
      await import("@/lib/config/marketplaces");
    expect(getAmazonMarketplaceConfig("BR").associateTag).toBe("legacy-tag-20");
  });

  it("US is disabled by default", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "");
    const { getAmazonMarketplaceConfig } =
      await import("@/lib/config/marketplaces");
    expect(getAmazonMarketplaceConfig("US").enabled).toBe(false);
  });

  it("US never falls back to petmol07-20 — that tag belongs to petmol.com.br, not PreçoCaindo", async () => {
    vi.stubEnv("AMAZON_US_ASSOCIATE_TAG", "");
    const { getAmazonMarketplaceConfig, AMAZON_STORE_IDS } =
      await import("@/lib/config/marketplaces");
    const config = getAmazonMarketplaceConfig("US");
    expect(config.associateTag).toBe("");
    expect(config.associateTag).not.toBe(AMAZON_STORE_IDS.US);
  });

  it("documents the real Store IDs as informational only", async () => {
    const { AMAZON_STORE_IDS } = await import("@/lib/config/marketplaces");
    expect(AMAZON_STORE_IDS.BR).toBe("petmol-20");
    expect(AMAZON_STORE_IDS.US).toBe("petmol07-20");
  });

  it("isMarketplaceCode accepts only known codes — invalid config fails explicitly", async () => {
    const { isMarketplaceCode } = await import("@/lib/config/marketplaces");
    expect(isMarketplaceCode("BR")).toBe(true);
    expect(isMarketplaceCode("US")).toBe(true);
    expect(isMarketplaceCode("XX")).toBe(false);
    expect(isMarketplaceCode("")).toBe(false);
  });

  it("getEnabledMarketplaces reflects config, not a hardcoded list", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_US_ENABLED", "false");
    const { getEnabledMarketplaces } =
      await import("@/lib/config/marketplaces");
    expect(getEnabledMarketplaces()).toEqual(["BR"]);
  });
});

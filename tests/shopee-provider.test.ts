import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("ShopeeProvider", () => {
  // Every "not configured" test below explicitly stubs the relevant vars
  // to empty — the ambient .env now has real Shopee credentials
  // (2026-09-07), so relying on the default/ambient environment being
  // empty would be exactly the test-isolation bug this project has hit
  // before (see tests/admin-auth.test.ts's history).
  it("fails explicitly when SHOPEE_AFFILIATE_ENABLED is not set", async () => {
    vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "");
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow(/SHOPEE_AFFILIATE_ENABLED/);
  });

  it("fails explicitly when enabled but no app id / secret key is configured", async () => {
    vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "true");
    vi.stubEnv("SHOPEE_AFFILIATE_API_ENABLED", "");
    vi.stubEnv("SHOPEE_APP_ID", "");
    vi.stubEnv("SHOPEE_SECRET_KEY", "");
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow(/SHOPEE_APP_ID|SHOPEE_SECRET_KEY/);
  });

  it("never calls the network when not configured", async () => {
    vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    expect(() => new ShopeeProvider()).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  function stubShopeeCredentials() {
    vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "true");
    vi.stubEnv("SHOPEE_AFFILIATE_API_ENABLED", "true");
    vi.stubEnv("SHOPEE_APP_ID", "test-app-id");
    vi.stubEnv("SHOPEE_SECRET_KEY", "test-secret");
  }

  it("once configured, getProduct signs the request and maps productOfferV2's response", async () => {
    stubShopeeCredentials();
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      expect(auth).toMatch(/^SHA256 Credential=test-app-id, Timestamp=\d+, Signature=[a-f0-9]{64}$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            productOfferV2: {
              nodes: [
                {
                  itemId: 123456,
                  productName: "Fone Bluetooth ABC",
                  productLink: "https://shopee.com.br/product/1/123456",
                  offerLink: "https://s.shopee.com.br/abc123",
                  priceMin: 89.9,
                  priceMax: 89.9,
                  commissionRate: 0.08,
                  sales: 340,
                  ratingStar: 4.7,
                },
              ],
            },
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    const provider = new ShopeeProvider();
    const product = await provider.getProduct("123456");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://open-api.affiliate.shopee.com.br/graphql",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(sentBody.query).toContain("itemId:123456");

    expect(product?.provider).toBe("SHOPEE");
    expect(product?.title).toBe("Fone Bluetooth ABC");
    expect(product?.offer.price).toBe(89.9);
    expect(product?.offer.affiliateUrl).toBe("https://s.shopee.com.br/abc123");
  });

  it("getProduct returns null when no node is found, rather than throwing", async () => {
    stubShopeeCredentials();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: { productOfferV2: { nodes: [] } } }),
      })),
    );
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    const provider = new ShopeeProvider();
    expect(await provider.getProduct("999999")).toBeNull();
  });

  it("getProduct rejects a non-numeric externalId rather than sending a malformed query", async () => {
    stubShopeeCredentials();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    const provider = new ShopeeProvider();
    await expect(provider.getProduct("not-a-number")).rejects.toThrow(/numeric/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("generateAffiliateLink calls the confirmed generateShortLink mutation with the given subIds", async () => {
    stubShopeeCredentials();
    const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: { generateShortLink: { shortLink: "https://s.shopee.com.br/xYz123" } },
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    const provider = new ShopeeProvider();
    const link = await provider.generateAffiliateLink(
      "https://shopee.com.br/product/1/123456",
      ["precocaindo", "adminqueue"],
    );

    expect(link).toBe("https://s.shopee.com.br/xYz123");
    const sentBody = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(sentBody.query).toContain("generateShortLink");
    expect(sentBody.query).toContain('"precocaindo"');
    expect(sentBody.query).toContain('"adminqueue"');
  });

  it("surfaces GraphQL-level errors instead of returning partial/wrong data", async () => {
    stubShopeeCredentials();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ errors: [{ message: "invalid signature" }] }),
      })),
    );
    const { ShopeeProvider } = await import("@/lib/providers/shopee-provider");
    const provider = new ShopeeProvider();
    await expect(provider.getProduct("123456")).rejects.toThrow(/invalid signature|GraphQL/);
  });
});

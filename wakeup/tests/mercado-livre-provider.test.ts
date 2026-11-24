import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("MercadoLivreProvider", () => {
  it("fails explicitly when MERCADO_LIVRE_ENABLED is not set (default)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "");
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    expect(() => new MercadoLivreProvider()).toThrow(/MERCADO_LIVRE_ENABLED/);
  });

  it("fails explicitly when enabled but no access token is configured", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "");
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    expect(() => new MercadoLivreProvider()).toThrow(/MERCADO_LIVRE_ACCESS_TOKEN/);
  });

  it("never calls the network when not configured", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    expect(() => new MercadoLivreProvider()).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("once configured, calls the confirmed GET /items/{id} endpoint with a Bearer token and maps the response — never claiming affiliateUrl is a monetized link", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubEnv("MERCADO_LIVRE_SITE_ID", "MLB");

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: "MLB123456",
        title: "Fone Bluetooth XPTO",
        price: 129.9,
        currency_id: "BRL",
        available_quantity: 5,
        status: "active",
        permalink: "https://produto.mercadolivre.com.br/MLB123456",
        thumbnail: "https://http2.mlstatic.com/thumb.jpg",
        attributes: [{ id: "BRAND", value_name: "XPTO" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    const product = await provider.getProduct("MLB123456");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/items/MLB123456"),
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token-123" },
      }),
    );
    expect(product?.provider).toBe("MERCADO_LIVRE");
    expect(product?.title).toBe("Fone Bluetooth XPTO");
    expect(product?.brand).toBe("XPTO");
    expect(product?.offer.price).toBe(129.9);
    expect(product?.offer.currency).toBe("BRL");
    expect(product?.offer.affiliateUrl).toBe(
      "https://produto.mercadolivre.com.br/MLB123456",
    );
    expect(product?.offer.availability).toBe("IN_STOCK");
  });

  it("returns null for a 404 rather than throwing", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );

    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    expect(await provider.getProduct("MLB000000")).toBeNull();
  });

  it("searchProducts stays unimplemented — its shape was never confirmed", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    await expect(
      provider.searchProducts({ keywords: "fone" }),
    ).rejects.toThrow(/not implemented/i);
  });

  it("getCatalogProductName calls GET /products/{id} — a different endpoint than getProduct's GET /items/{id} — confirmed via a real highlighted id 404ing on /items but resolving on /products (2026-09-07)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: "MLB78821532",
        name: "Celular Samsung Galaxy A17 128GB",
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    const name = await provider.getCatalogProductName("MLB78821532");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/products/MLB78821532"),
      expect.anything(),
    );
    expect(name).toBe("Celular Samsung Galaxy A17 128GB");
  });

  it("getCatalogProductName returns null for a 404 rather than throwing", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    expect(await provider.getCatalogProductName("MLB000000")).toBeNull();
  });

  it("getCatalogProductDetail returns the full real shape and tolerates a product with no GTIN attribute (confirmed live: not always present)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          id: "MLB78878512",
          name: "Smartphone Samsung Galaxy A17",
          domain_id: "MLB-CELLPHONES",
          pictures: [{ url: "https://http2.mlstatic.com/x.jpg" }],
          attributes: [
            { id: "BRAND", value_name: "Samsung" },
            { id: "MODEL", value_name: "Galaxy A17" },
            // no GTIN entry — must not throw or fabricate one.
          ],
        }),
      })),
    );
    const { MercadoLivreProvider, findAttribute } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    const detail = await provider.getCatalogProductDetail("MLB78878512");
    expect(detail?.name).toBe("Smartphone Samsung Galaxy A17");
    expect(findAttribute(detail!, "BRAND")).toBe("Samsung");
    expect(findAttribute(detail!, "GTIN")).toBeUndefined();
  });

  it("getCatalogProductItems calls GET /products/{id}/items and returns real seller offers, tolerating a null original_price (no discount)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        paging: { total: 1, offset: 0, limit: 100 },
        results: [
          {
            item_id: "MLB7594574392",
            seller_id: 127987360,
            price: 949,
            original_price: null,
            currency_id: "BRL",
            condition: "new",
            shipping: { free_shipping: true },
          },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    const items = await provider.getCatalogProductItems("MLB78878512");
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/products/MLB78878512/items"),
      expect.anything(),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.item_id).toBe("MLB7594574392");
    expect(items[0]!.original_price).toBeNull();
  });

  it("getCatalogProductItems returns an empty array for a 404 rather than throwing", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    expect(await provider.getCatalogProductItems("MLB000000")).toEqual([]);
  });

  it("getSellerReputation maps the real response shape and tolerates a seller with no reputation history yet (level_id: null — a real, confirmed shape for a NEWBIE seller)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token-123");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          nickname: "SOMESELLER",
          seller_reputation: { level_id: null, power_seller_status: null, transactions: { total: 0 } },
        }),
      })),
    );
    const { MercadoLivreProvider } = await import(
      "@/lib/providers/mercado-livre-provider"
    );
    const provider = new MercadoLivreProvider();
    const reputation = await provider.getSellerReputation(123);
    expect(reputation).toEqual({
      sellerId: 123,
      nickname: "SOMESELLER",
      levelId: null,
      powerSellerStatus: null,
      transactionsTotal: 0,
    });
  });
});

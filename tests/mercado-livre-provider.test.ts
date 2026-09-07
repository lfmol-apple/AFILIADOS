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
});

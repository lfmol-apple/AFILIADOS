import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("MercadoLivreTrendsDemandSource", () => {
  it("fails explicitly when not configured, never silently returning an empty result", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "");
    const { MercadoLivreTrendsDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-trends-demand-source"
    );
    const source = new MercadoLivreTrendsDemandSource();
    await expect(source.collect()).rejects.toThrow(/MERCADO_LIVRE_ENABLED/);
  });

  it("maps real ranked keywords into DemandSignals with a rank-derived (not fabricated) observedCount", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [{ keyword: "air fryer" }, { keyword: "fone bluetooth" }],
      })),
    );

    const { MercadoLivreTrendsDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-trends-demand-source"
    );
    const signals = await new MercadoLivreTrendsDemandSource().collect();

    expect(signals).toHaveLength(2);
    expect(signals[0]).toMatchObject({
      keyword: "air fryer",
      source: "mercado_livre_trends",
      observedCount: 2, // rank 1 of 2
    });
    expect(signals[1]).toMatchObject({
      keyword: "fone bluetooth",
      observedCount: 1, // rank 2 of 2
    });
  });
});

describe("MercadoLivreBestsellerDemandSource", () => {
  it("fails explicitly when not configured", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "");
    const { MercadoLivreBestsellerDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-bestseller-demand-source"
    );
    const source = new MercadoLivreBestsellerDemandSource("MLB1051", async () => "x");
    await expect(source.collect()).rejects.toThrow(/MERCADO_LIVRE_ENABLED/);
  });

  it("resolves each item id to a real title via the injected resolver, never using the raw id as a keyword", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [
            { id: "MLB1", position: 1, type: "ITEM" },
            { id: "MLB2", position: 2, type: "ITEM" },
          ],
        }),
      })),
    );

    const titles: Record<string, string> = { MLB1: "Air Fryer XPTO", MLB2: "Liquidificador ABC" };
    const { MercadoLivreBestsellerDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-bestseller-demand-source"
    );
    const source = new MercadoLivreBestsellerDemandSource(
      "MLB1051",
      async (id) => titles[id] ?? null,
    );
    const signals = await source.collect();

    expect(signals).toHaveLength(2);
    expect(signals.map((s) => s.keyword)).toEqual([
      "Air Fryer XPTO",
      "Liquidificador ABC",
    ]);
    expect(signals.every((s) => s.intent === "BEST_OF")).toBe(true);
  });

  it("skips an item whose title can't be resolved, rather than fabricating a keyword from its raw id", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ id: "MLB404", position: 1, type: "ITEM" }],
        }),
      })),
    );

    const { MercadoLivreBestsellerDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-bestseller-demand-source"
    );
    const source = new MercadoLivreBestsellerDemandSource("MLB1051", async () => null);
    const signals = await source.collect();

    expect(signals).toEqual([]);
  });

  it("collectRaw() preserves the real itemId — needed by anything that persists a MerchantListing row (scripts/ml-demand-e2e-check.ts)", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ id: "MLB1", position: 1, type: "ITEM" }],
        }),
      })),
    );

    const { MercadoLivreBestsellerDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-bestseller-demand-source"
    );
    const source = new MercadoLivreBestsellerDemandSource(
      "MLB1051",
      async () => "Air Fryer XPTO",
    );
    const raw = await source.collectRaw();

    expect(raw).toEqual([
      { itemId: "MLB1", position: 1, title: "Air Fryer XPTO" },
    ]);
  });
});

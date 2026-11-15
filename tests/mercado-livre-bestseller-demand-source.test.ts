import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MercadoLivreBestsellerDemandSource", () => {
  it("a single entry's resolveTitle throwing (real 403, confirmed live 2026-11-15 on USER_PRODUCT ids) never discards its siblings in the same category", async () => {
    vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
    vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          content: [
            { id: "MLBU1", position: 1, type: "USER_PRODUCT" },
            { id: "MLB2", position: 2, type: "PRODUCT" },
            { id: "MLB3", position: 3, type: "PRODUCT" },
          ],
        }),
      })),
    );

    const { MercadoLivreBestsellerDemandSource } = await import(
      "@/lib/demand/sources/mercado-livre-bestseller-demand-source"
    );

    const resolveTitle = vi.fn(async (itemId: string) => {
      if (itemId === "MLBU1") throw new Error("HTTP 403");
      return `Título real ${itemId}`;
    });

    const source = new MercadoLivreBestsellerDemandSource(
      "MLB1051",
      resolveTitle,
      () => "fake-token",
    );
    const highlights = await source.collectRaw();

    expect(highlights.map((h) => h.itemId)).toEqual(["MLB2", "MLB3"]);
  });
});

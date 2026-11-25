import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageResponse } from "next/og";

/**
 * Owner's directive, 2026-11-25 ("prepare a composição híbrida...
 * garanta que essa mudança não provoque regeneração dos 17 criativos
 * existentes" + "garanta o ajuste automático... de textos de
 * benefícios"): end-to-end test of the real orchestration (background
 * generation → crop → deterministic text overlay → CTA bar → hybrid
 * margin gate) with only the network call mocked — everything else
 * (compositor, margin check) is the REAL code, same spirit as
 * generateOneShotAd's own tests in one-shot-ad-generator.test.ts.
 */
describe("generateHybridAdOverlay — real pipeline, mocked network only", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB-TEST");
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS", "5");
    vi.stubEnv("VITRINE_CREATIVE_MODE", "piloto_autorizado");
    vi.stubEnv("VITRINE_CREATIVE_PILOT_MAX_CALLS", "5");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function fakePhoto(): Buffer {
    // A 1x1 real PNG is enough — generateCreativeBase never decodes the
    // input photo itself, only forwards it to the (mocked) network call.
    return Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
  }

  async function realAiBackgroundPng(): Promise<Buffer> {
    // The real pipeline decodes this as an actual image (renderCatalogClean's
    // <img> → Satori), so the mocked network response must be a genuine
    // PNG, not an arbitrary string — same requirement
    // hybrid-text-overlay.test.tsx's solidBaseImage() exists to satisfy.
    const res = new ImageResponse(<div style={{ width: 1024, height: 1536, display: "flex", background: "#3a3a3a" }} />, {
      width: 1024,
      height: 1536,
    });
    return Buffer.from(await res.arrayBuffer());
  }

  it("produces a final image at the real final dimensions, baked price correct, and the hybrid margin gate passes", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: (await realAiBackgroundPng()).toString("base64") }] }),
    });
    const { generateHybridAdOverlay } = await import("@/lib/services/ai-creative-factory/hybrid-ad-generator");
    const { decodePng } = await import("@/lib/services/ai-creative-factory/png-decode");

    const result = await generateHybridAdOverlay({
      externalId: "MLB-TEST",
      title: "Secador De Cabelos Philco PSC3500 4 Em 1 Dobrável Motor BLDC",
      brand: "Philco",
      productPhoto: fakePhoto(),
      productPhotoContentType: "image/png",
      currentPrice: 498.9,
      referencePrice: 709.0,
      hasConfirmedDiscount: true,
      benefits: ["4 FUNÇÕES EM 1", "DOBRÁVEL FÁCIL DE GUARDAR"],
    });

    expect(result.mechanism).toBe("hybrid_v1");
    expect(result.bakedCurrentPrice).toBe(498.9);
    expect(result.bakedReferencePrice).toBe(709.0);
    expect(result.marginCheck.safe).toBe(true);
    expect(result.marginCheck.layoutViolations).toEqual([]);
    expect(result.marginCheck.pixelViolations).toEqual([]);

    const decoded = decodePng(result.finalImageBuffer);
    expect(decoded.width).toBe(1080);
    expect(decoded.height).toBe(1350);
  });

  it("omits the crossed-out reference price from bakedReferencePrice when there is no real confirmed drop", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: (await realAiBackgroundPng()).toString("base64") }] }),
    });
    const { generateHybridAdOverlay } = await import("@/lib/services/ai-creative-factory/hybrid-ad-generator");

    const result = await generateHybridAdOverlay({
      externalId: "MLB-TEST",
      title: "Fritadeira Elétrica Air Fryer Quad Fry Elgin",
      brand: "Elgin",
      productPhoto: fakePhoto(),
      productPhotoContentType: "image/png",
      currentPrice: 179.0,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });

    expect(result.bakedReferencePrice).toBeNull();
    expect(result.marginCheck.safe).toBe(true);
  });

  it("propagates OneShotMigrationNotAuthorizedError for a product outside the allowlist, never reaching the network", async () => {
    vi.stubEnv("VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST", "MLB-SOME-OTHER-PRODUCT");
    const { generateHybridAdOverlay } = await import("@/lib/services/ai-creative-factory/hybrid-ad-generator");
    const { OneShotMigrationNotAuthorizedError } = await import("@/lib/services/ai-creative-factory/one-shot-ad-generator");

    await expect(
      generateHybridAdOverlay({
        externalId: "MLB-TEST",
        title: "Produto Teste",
        brand: null,
        productPhoto: fakePhoto(),
        productPhotoContentType: "image/png",
        currentPrice: 99.9,
        referencePrice: null,
        hasConfirmedDiscount: false,
        benefits: [],
      }),
    ).rejects.toBeInstanceOf(OneShotMigrationNotAuthorizedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

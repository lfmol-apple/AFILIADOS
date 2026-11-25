import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner's directive, 2026-11-25 ("prepare a composição híbrida como
 * mecanismo preferencial para novos produtos, condicionada à minha
 * aprovação visual... garanta que essa mudança não provoque regeneração
 * dos 17 criativos existentes"): proves three real behaviors, not just
 * the absence of an import —
 *   1. Default config (env.VITRINE_NEW_PRODUCT_MECHANISM unset/"one_shot_v1")
 *      behaves exactly as before: a brand-new product still uses
 *      generateOneShotAd, never the hybrid generator.
 *   2. With the flag flipped to "hybrid_v1", a brand-new product (no
 *      existing ad_overlay row) uses generateHybridAdOverlay instead.
 *   3. Critically: an EXISTING, already-approved one_shot_v1 row is
 *      NEVER regenerated just because the flag was flipped — the flag is
 *      only ever consulted when there is no existing row at all.
 */

const oneShotMock = vi.fn();
const hybridMock = vi.fn();
const generateCreativeBaseMock = vi.fn();
const createMock = vi.fn();
const findManyCreativeMock = vi.fn();
const updateManyMock = vi.fn();
const finalRenderExistsMock = vi.fn(() => true);

vi.mock("@/lib/jobs/automation-run", () => ({
  runJob: async (_name: string, fn: (ctx: { counters: Record<string, number>; metadata: Record<string, unknown> }) => Promise<void>) => {
    const ctx = { counters: { processed: 0, created: 0, updated: 0, errors: 0 }, metadata: {} };
    await fn(ctx);
    return ctx.counters;
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vitrineSelection: {
      findMany: vi.fn(async () => [
        {
          merchantListingId: "listing-tssaper-1",
          scoreBreakdown: { matchedEventName: null },
          merchantListing: {
            canonicalProduct: { publicSlug: "pistola-tssaper-tp550", title: "Pistola Tssaper TP550", brand: "Tssaper", categoryId: null },
          },
        },
      ]),
    },
    vitrineCreative: {
      findMany: findManyCreativeMock,
      create: createMock,
      updateMany: updateManyMock,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

vi.mock("@/lib/queries/public-product", () => ({
  loadPublicMerchantProduct: vi.fn(async () => ({
    title: "Pistola de pulverização elétrica Tssaper TP550",
    brand: "Tssaper",
    imageUrl: "https://example.test/tssaper.jpg",
    currentPrice: 228.9,
    referencePrice: 376.7,
    discountPercent: 0.39,
    rating: null,
    reviewCount: null,
  })),
}));

vi.mock("@/lib/services/ai-creative-factory/budget", () => ({
  checkCreativeBudget: vi.fn(async () => ({ allowed: true })),
  recordCreativeSpend: vi.fn(async () => {}),
}));

vi.mock("@/lib/services/ai-creative-factory/one-shot-ad-generator", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/ai-creative-factory/one-shot-ad-generator")>(
    "@/lib/services/ai-creative-factory/one-shot-ad-generator",
  );
  return { ...actual, generateOneShotAd: oneShotMock };
});

vi.mock("@/lib/services/ai-creative-factory/hybrid-ad-generator", () => ({
  generateHybridAdOverlay: hybridMock,
}));

vi.mock("@/lib/services/ai-creative-factory/openai-image-client", () => ({
  generateCreativeBase: generateCreativeBaseMock,
  OpenAiImageNotConfiguredError: class OpenAiImageNotConfiguredError extends Error {},
  AI_GENERATION_SIZE: "1024x1536",
}));

vi.mock("@/lib/services/ai-creative-factory/quality-control", () => ({
  runQualityControl: vi.fn(async () => ({ status: "approved", notes: "ok (mock)", visionCheckCostUsd: null, classification: "ambientacao_legitima" })),
}));

vi.mock("@/lib/services/ai-creative-factory/margin-safety-check", () => ({
  checkMarginSafety: vi.fn(() => ({ safe: true, violations: [] })),
}));

const compositeDeterministicCtaBarMock = vi.fn(async () => Buffer.from("fake-png-bytes-with-bar"));
vi.mock("@/lib/services/ai-creative-factory/compositor", () => ({
  renderCatalogClean: vi.fn(() => ({})),
  renderAdOverlay: vi.fn(() => {
    throw new Error("renderAdOverlay must never be called");
  }),
  toBuffer: vi.fn(async () => Buffer.from("fake-png-bytes")),
  compositeDeterministicCtaBar: compositeDeterministicCtaBarMock,
  CtaBarAssetMissingError: class CtaBarAssetMissingError extends Error {},
  CREATIVE_FINAL_DIMENSIONS: { width: 1080, height: 1350 },
  CTA_BAR_HEIGHT_FRACTION: 0.12625,
}));

vi.mock("@/lib/services/ai-creative-factory/creative-image-store", () => ({
  saveAiBase: vi.fn(() => "fake-ai-base.png"),
  saveFinalRender: vi.fn(() => "https://precocaindo.com.br/api/vitrine/creative-asset/fake-final.png"),
  finalRenderExists: finalRenderExistsMock,
}));

let newProductMechanism: "one_shot_v1" | "hybrid_v1" = "one_shot_v1";
vi.mock("@/lib/config/env", () => ({
  get env() {
    return {
      VITRINE_CREATIVE_FORCE_REGENERATE_IDS: "",
      VITRINE_CREATIVE_REJECTION_MAX_CONSECUTIVE: 2,
      VITRINE_CREATIVE_REJECTION_COOLDOWN_HOURS: 24,
      VITRINE_PRICE_REGENERATION_MIN_INTERVAL_HOURS: 24,
      get VITRINE_NEW_PRODUCT_MECHANISM() {
        return newProductMechanism;
      },
    };
  },
}));

beforeEach(() => {
  newProductMechanism = "one_shot_v1";
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(8) })));
  findManyCreativeMock.mockReset();
  createMock.mockReset();
  updateManyMock.mockReset();
  oneShotMock.mockReset();
  hybridMock.mockReset();
  generateCreativeBaseMock.mockReset();
  finalRenderExistsMock.mockReset();
  finalRenderExistsMock.mockReturnValue(true);
  compositeDeterministicCtaBarMock.mockReset();
  compositeDeterministicCtaBarMock.mockResolvedValue(Buffer.from("fake-png-bytes-with-bar"));

  oneShotMock.mockResolvedValue({
    imageBuffer: Buffer.from("fake-one-shot-png"),
    costUsd: 0.041,
    model: "gpt-image-2",
    size: "1024x1536",
    quality: "medium",
    promptText: "prompt one-shot (teste)",
    bakedCurrentPrice: 228.9,
    bakedReferencePrice: 376.7,
  });
  hybridMock.mockResolvedValue({
    aiImageBuffer: Buffer.from("fake-hybrid-background-png"),
    finalImageBuffer: Buffer.from("fake-hybrid-final-png"),
    model: "gpt-image-2",
    costUsd: 0.041,
    promptText: "prompt híbrido (teste)",
    mechanism: "hybrid_v1",
    bakedCurrentPrice: 228.9,
    bakedReferencePrice: 376.7,
    marginCheck: { safe: true, layoutViolations: [], pixelViolations: [] },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function noExistingAdOverlay() {
  findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
    if (args.where.kind === "catalog_clean") {
      return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
    }
    return [];
  });
}

function existingApprovedOneShotRow() {
  findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
    if (args.where.kind === "catalog_clean") {
      return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
    }
    return [
      {
        id: "ad-overlay-existing",
        version: 7,
        qualityStatus: "approved",
        generatedAt: new Date(),
        promptInputs: {
          mechanism: "one_shot_v1",
          henriqueStandardVersion: "v1",
          bakedCurrentPrice: 228.9,
          bakedReferencePrice: 376.7,
          categoryHint: null,
          isSeasonalEvent: null,
        },
      },
    ];
  });
}

describe("new-product mechanism preference — prepared, conditioned on explicit approval (2026-11-25)", () => {
  it("default config: a brand-new product still uses generateOneShotAd, never the hybrid generator", async () => {
    noExistingAdOverlay();
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).toHaveBeenCalledTimes(1);
    expect(hybridMock).not.toHaveBeenCalled();
  });

  it("flag flipped to hybrid_v1: a brand-new product uses generateHybridAdOverlay instead, tagged hybrid_v1", async () => {
    newProductMechanism = "hybrid_v1";
    noExistingAdOverlay();
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(hybridMock).toHaveBeenCalledTimes(1);
    expect(oneShotMock).not.toHaveBeenCalled();
    const adOverlayCreateCall = createMock.mock.calls.find((call) => call[0].data.kind === "ad_overlay");
    expect(adOverlayCreateCall).toBeDefined();
    expect(adOverlayCreateCall![0].data.promptInputs.mechanism).toBe("hybrid_v1");
    expect(adOverlayCreateCall![0].data.qualityStatus).toBe("approved");
  });

  it("flag flipped to hybrid_v1: an EXISTING approved one_shot_v1 row is never touched or regenerated", async () => {
    newProductMechanism = "hybrid_v1";
    existingApprovedOneShotRow();
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    // The flag is only consulted for brand-new products — an existing
    // row's own regeneration decision (shouldRegenerateAdOverlay) never
    // changes just because the global default moved: neither generator
    // ran, and nothing was written to the database at all.
    expect(oneShotMock).not.toHaveBeenCalled();
    expect(hybridMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects via the hybrid-specific gate (geometry + bottom pixel) and never the one_shot pixel top-margin gate", async () => {
    newProductMechanism = "hybrid_v1";
    noExistingAdOverlay();
    hybridMock.mockResolvedValueOnce({
      aiImageBuffer: Buffer.from("fake"),
      finalImageBuffer: Buffer.from("fake"),
      model: "gpt-image-2",
      costUsd: 0.041,
      promptText: "prompt híbrido (teste)",
      mechanism: "hybrid_v1",
      bakedCurrentPrice: 228.9,
      bakedReferencePrice: 376.7,
      marginCheck: {
        safe: false,
        layoutViolations: [{ check: "price_reserved_zone_overlap", detail: "mock violation" }],
        pixelViolations: [],
      },
    });
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    const rejectedCall = createMock.mock.calls.find((call) => call[0].data.qualityStatus === "rejected");
    expect(rejectedCall).toBeDefined();
    expect(rejectedCall![0].data.qualityNotes).toContain("checagem híbrida");
    expect(rejectedCall![0].data.promptInputs.mechanism).toBe("hybrid_v1");
  });
});

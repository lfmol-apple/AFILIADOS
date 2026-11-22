import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner's directive, 2026-11-21: "verifique também se os testes
 * estruturais garantem efetivamente o uso do mecanismo one-shot e não
 * apenas a ausência de determinado import." A missing-import check (see
 * tests/one-shot-ad-generator.test.ts) proves the OLD path can't be
 * reached by accident, but not that the NEW path is actually exercised.
 * This test runs the real `runVitrineCreativeFactoryJob()` body (with
 * Prisma, the job lock, and every paid/network boundary mocked) against
 * one fake active product, and asserts on the REAL EFFECT: the one-shot
 * generator was actually called, and the row it writes to the database
 * is tagged with the one-shot mechanism — not just "no old import".
 */

const oneShotMock = vi.fn();
const generateCreativeBaseMock = vi.fn();
const createMock = vi.fn();
const findFirstMock = vi.fn();
const updateManyMock = vi.fn();

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
      findFirst: findFirstMock,
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
  return {
    ...actual,
    generateOneShotAd: oneShotMock,
  };
});

vi.mock("@/lib/services/ai-creative-factory/openai-image-client", () => ({
  generateCreativeBase: generateCreativeBaseMock,
  OpenAiImageNotConfiguredError: class OpenAiImageNotConfiguredError extends Error {},
}));

vi.mock("@/lib/services/ai-creative-factory/quality-control", () => ({
  runQualityControl: vi.fn(async () => ({ status: "approved", notes: "ok (mock)", visionCheckCostUsd: null, classification: "ambientacao_legitima" })),
}));

vi.mock("@/lib/services/ai-creative-factory/compositor", () => ({
  renderCatalogClean: vi.fn(() => ({})),
  renderAdOverlay: vi.fn(() => {
    throw new Error("renderAdOverlay must never be called by the one-shot ad_overlay path");
  }),
  toBuffer: vi.fn(async () => Buffer.from("fake-png-bytes")),
}));

vi.mock("@/lib/services/ai-creative-factory/creative-image-store", () => ({
  saveAiBase: vi.fn(() => "fake-ai-base.png"),
  saveFinalRender: vi.fn(() => "https://precocaindo.com.br/api/vitrine/creative-asset/fake-final.png"),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(8) })));
  findFirstMock.mockReset();
  createMock.mockReset();
  updateManyMock.mockReset();
  oneShotMock.mockReset();
  generateCreativeBaseMock.mockReset();

  // catalog_clean: pretend an approved row already exists so that path is
  // skipped — this test isolates proof for ad_overlay specifically.
  // ad_overlay: no existing row at all — forces full (one-shot) generation.
  findFirstMock.mockImplementation(async (args: { where: { kind: string } }) => {
    if (args.where.kind === "catalog_clean") {
      return { version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null } };
    }
    return null; // no ad_overlay row yet
  });

  oneShotMock.mockResolvedValue({
    imageBuffer: Buffer.from("fake-one-shot-png"),
    costUsd: 0.041,
    model: "gpt-image-2",
    size: "1024x1536",
    quality: "medium",
    promptText: "prompt de teste",
    bakedCurrentPrice: 228.9,
    bakedReferencePrice: 376.7,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("runVitrineCreativeFactoryJob — ad_overlay really uses the one-shot mechanism (behavioral proof, not just an import check)", () => {
  it("calls generateOneShotAd (not generateCreativeBase/renderAdOverlay) for a product with no existing ad_overlay", async () => {
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).toHaveBeenCalledTimes(1);
    expect(oneShotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pistola de pulverização elétrica Tssaper TP550",
        brand: "Tssaper",
        currentPrice: 228.9,
        referencePrice: 376.7,
        hasConfirmedDiscount: true,
      }),
    );
    // The catalog_clean path legitimately still uses generateCreativeBase
    // directly — but ONLY for catalog_clean, and here that row already
    // existed and was approved, so it should never have been called at all.
    expect(generateCreativeBaseMock).not.toHaveBeenCalled();
  });

  it("writes the created ad_overlay row tagged with the one-shot mechanism and the real baked price", async () => {
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    const adOverlayCreateCall = createMock.mock.calls.find((call) => call[0].data.kind === "ad_overlay");
    expect(adOverlayCreateCall).toBeDefined();
    const data = adOverlayCreateCall![0].data;
    expect(data.promptInputs.mechanism).toBe("one_shot_v1");
    expect(data.promptInputs.bakedCurrentPrice).toBe(228.9);
    expect(data.promptInputs.bakedReferencePrice).toBe(376.7);
    expect(data.qualityStatus).toBe("approved");
    expect(data.publishedAt).toBeInstanceOf(Date);
  });

  it("never leaves a stale-priced ad_overlay looking published when the replacement attempt is REJECTED by QC", async () => {
    const qualityControl = await import("@/lib/services/ai-creative-factory/quality-control");
    vi.mocked(qualityControl.runQualityControl).mockResolvedValueOnce({
      status: "rejected",
      notes: "defeito real (mock)",
      visionCheckCostUsd: null,
      classification: "alteracao_factual",
    });

    // An existing, already-published one-shot row whose baked price (200)
    // no longer matches the live price (228.90) mocked in beforeEach.
    findFirstMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return { version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null } };
      }
      return {
        id: "ad-overlay-old-row",
        version: 1,
        qualityStatus: "approved",
        promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 200, bakedReferencePrice: null, categoryHint: null, isSeasonalEvent: null },
      };
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ad-overlay-old-row" }, data: { publishedAt: null } }),
    );
  });

  it("debounces a price-only staleness trigger — unpublishes immediately but never spends money again inside the minimum interval", async () => {
    const recentAttempt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    findFirstMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return { version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null } };
      }
      return {
        id: "ad-overlay-price-stale-row",
        version: 1,
        qualityStatus: "approved",
        generatedAt: recentAttempt, // last real attempt only 2h ago
        promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 200, bakedReferencePrice: null, categoryHint: null, isSeasonalEvent: null },
      };
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    // Safety: still comes down immediately.
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ad-overlay-price-stale-row" }, data: { publishedAt: null } }),
    );
    // Cost control: the default minimum interval (24h) hasn't elapsed — no paid attempt yet.
    expect(oneShotMock).not.toHaveBeenCalled();
  });
});

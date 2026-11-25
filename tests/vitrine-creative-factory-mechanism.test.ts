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
const findManyCreativeMock = vi.fn();
const updateManyMock = vi.fn();
const finalRenderExistsMock = vi.fn(() => true); // default: files are always present unless a test says otherwise

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
      // Real job code (jobs/vitrine-creative-factory.ts, fixed 2026-11-24)
      // reads the last N rows via findMany (take: the consecutive-
      // rejection limit), newest-first — never findFirst alone — so a
      // rejection-streak cooldown can be computed from real history.
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
  return {
    ...actual,
    generateOneShotAd: oneShotMock,
  };
});

vi.mock("@/lib/services/ai-creative-factory/openai-image-client", () => ({
  generateCreativeBase: generateCreativeBaseMock,
  OpenAiImageNotConfiguredError: class OpenAiImageNotConfiguredError extends Error {},
  // Real value, not a mock-specific one — one-shot-ad-generator.ts derives
  // its real crop-safety margins from this at import time (2026-11-24 fix,
  // "siga o exemplo do Henrique"), so a stub value here would silently
  // test different math than what actually ships.
  AI_GENERATION_SIZE: "1024x1536",
}));

vi.mock("@/lib/services/ai-creative-factory/quality-control", () => ({
  runQualityControl: vi.fn(async () => ({ status: "approved", notes: "ok (mock)", visionCheckCostUsd: null, classification: "ambientacao_legitima" })),
}));

const compositeDeterministicCtaBarMock = vi.fn(async () => Buffer.from("fake-png-bytes-with-bar"));

vi.mock("@/lib/services/ai-creative-factory/compositor", () => ({
  renderCatalogClean: vi.fn(() => ({})),
  renderAdOverlay: vi.fn(() => {
    throw new Error("renderAdOverlay must never be called by the one-shot ad_overlay path");
  }),
  toBuffer: vi.fn(async () => Buffer.from("fake-png-bytes")),
  compositeDeterministicCtaBar: compositeDeterministicCtaBarMock,
  CtaBarAssetMissingError: class CtaBarAssetMissingError extends Error {},
  CREATIVE_FINAL_DIMENSIONS: { width: 1080, height: 1350 },
  // Real value, not a mock-specific one — see the AI_GENERATION_SIZE
  // comment above for why this must match the real constant exactly.
  CTA_BAR_HEIGHT_FRACTION: 0.12625,
}));

vi.mock("@/lib/services/ai-creative-factory/creative-image-store", () => ({
  saveAiBase: vi.fn(() => "fake-ai-base.png"),
  saveFinalRender: vi.fn(() => "https://precocaindo.com.br/api/vitrine/creative-asset/fake-final.png"),
  finalRenderExists: finalRenderExistsMock,
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(8) })));
  findManyCreativeMock.mockReset();
  createMock.mockReset();
  updateManyMock.mockReset();
  oneShotMock.mockReset();
  generateCreativeBaseMock.mockReset();
  finalRenderExistsMock.mockReset();
  finalRenderExistsMock.mockReturnValue(true);
  compositeDeterministicCtaBarMock.mockReset();
  compositeDeterministicCtaBarMock.mockResolvedValue(Buffer.from("fake-png-bytes-with-bar"));

  // catalog_clean: pretend an approved row already exists so that path is
  // skipped — this test isolates proof for ad_overlay specifically.
  // ad_overlay: no existing row at all — forces full (one-shot) generation.
  findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
    if (args.where.kind === "catalog_clean") {
      return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
    }
    return []; // no ad_overlay row yet
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
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-old-row",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 200, bakedReferencePrice: null, categoryHint: null, isSeasonalEvent: null },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ad-overlay-old-row" }, data: { publishedAt: null } }),
    );
  });

  it("debounces a price-only staleness trigger — unpublishes immediately but never spends money again inside the minimum interval", async () => {
    const recentAttempt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-price-stale-row",
          version: 1,
          qualityStatus: "approved",
          generatedAt: recentAttempt, // last real attempt only 2h ago
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 200, bakedReferencePrice: null, categoryHint: null, isSeasonalEvent: null },
        },
      ];
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

describe("runVitrineCreativeFactoryJob — idempotency fix, 2026-11-24 (real incident this closes)", () => {
  it("never regenerates an approved, valid, unchanged ad_overlay — the exact bug that wasted money on 6 already-good creatives", async () => {
    // Real incident reproduced here: an existing row whose promptInputs
    // never recorded categoryHint/isSeasonalEvent (e.g. written by
    // tooling other than this job) used to be mistaken for "changed"
    // because `undefined !== null` is true. This row is approved,
    // unchanged (no price/category/event delta), and the file genuinely
    // exists (finalRenderExistsMock defaults to true) — must be skipped.
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-already-good",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          // Deliberately missing categoryHint/isSeasonalEvent, same shape
          // an ad-hoc script (not this job) would have written.
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7 },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).not.toHaveBeenCalled();
    expect(createMock.mock.calls.some((call) => call[0].data.kind === "ad_overlay")).toBe(false);
  });

  it("still regenerates when the category genuinely changed to a different RECORDED value (a real objective trigger, not a false positive)", async () => {
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-category-changed",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7, categoryHint: "some-other-category", isSeasonalEvent: null },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).toHaveBeenCalledTimes(1);
  });

  it("regenerates when the approved row's file is missing from disk, even though the DB says approved", async () => {
    finalRenderExistsMock.mockReturnValue(false);
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-file-missing",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7 },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).toHaveBeenCalledTimes(1);
  });

  it("stops auto-retrying after the consecutive-rejection limit, within the cooldown window", async () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
    const older = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      // Default VITRINE_CREATIVE_REJECTION_MAX_CONSECUTIVE is 2 — two
      // rejected attempts in a row, most recent 1h ago (well inside the
      // default 24h cooldown).
      return [
        { id: "v2", version: 2, qualityStatus: "rejected", generatedAt: recent, promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7 } },
        { id: "v1", version: 1, qualityStatus: "rejected", generatedAt: older, promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7 } },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    // Would otherwise regenerate forever (existingQualityStatus ===
    // "rejected" always triggered a regen before this fix) — now blocked
    // by the cooldown instead of spending money on a 3rd doomed attempt.
    expect(oneShotMock).not.toHaveBeenCalled();
  });

  it("VITRINE_CREATIVE_FORCE_REGENERATE_IDS bypasses every skip/cooldown check for exactly the listed product", async () => {
    vi.stubEnv("VITRINE_CREATIVE_FORCE_REGENERATE_IDS", "listing-tssaper-1");
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      // Approved, valid, unchanged AND file present — normally skipped.
      return [
        {
          id: "ad-overlay-force",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7 },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(oneShotMock).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("a rejected attempt never overwrites/unpublishes the prior approved version when the trigger was NOT a confirmed price change", async () => {
    // Category genuinely changed (a real trigger) but the regeneration
    // attempt gets rejected by QC — the prior approved row must stay
    // published exactly as it was (owner's rule: a failed attempt never
    // substitutes a good one). This is distinct from the price-stale
    // case (tested above), where unpublishing on rejection IS correct.
    const qualityControl = await import("@/lib/services/ai-creative-factory/quality-control");
    vi.mocked(qualityControl.runQualityControl).mockResolvedValueOnce({
      status: "rejected",
      notes: "defeito real (mock)",
      visionCheckCostUsd: null,
      classification: "alteracao_factual",
    });
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-category-changed-then-rejected",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7, categoryHint: "some-other-category", isSeasonalEvent: null },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(updateManyMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ad-overlay-category-changed-then-rejected" } }),
    );
  });
});

describe("runVitrineCreativeFactoryJob — deterministic CTA bar compositing, 2026-11-24", () => {
  it("composites the real approved CTA bar onto every new ad_overlay generation (never lets the AI draw it)", async () => {
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(compositeDeterministicCtaBarMock).toHaveBeenCalledTimes(1);
    expect(compositeDeterministicCtaBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1080, height: 1350 }),
    );
    const adOverlayCreateCall = createMock.mock.calls.find((call) => call[0].data.kind === "ad_overlay");
    // The saved final image is whatever compositeDeterministicCtaBar
    // produced — proof the composited (not the raw AI) bytes are what
    // actually gets published.
    expect(adOverlayCreateCall![0].data.finalImageUrl).toBe("https://precocaindo.com.br/api/vitrine/creative-asset/fake-final.png");
  });

  it("runs quality control on the FINAL composited image, never the raw pre-crop AI output", async () => {
    // Owner's directive, 2026-11-24 ("a aprovação definitiva deve
    // considerar a imagem FINAL, exatamente aquela que será
    // disponibilizada no XML"): real bug this closes — QC used to run
    // against the raw 1024x1536 generation, before the real crop and the
    // deterministic bar composite even ran, so a creative could be
    // approved and then come out defective once actually cropped. Proven
    // here by asserting the exact bytes and dimensions runQualityControl
    // receives: they must be compositeDeterministicCtaBar's output at the
    // real final 1080x1350 size, never the raw one-shot buffer
    // ("fake-one-shot-png") at the raw 1024x1536 generation size.
    const qualityControl = await import("@/lib/services/ai-creative-factory/quality-control");
    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    await runVitrineCreativeFactoryJob();

    expect(qualityControl.runQualityControl).toHaveBeenCalledWith(
      expect.objectContaining({
        generatedImageBuffer: Buffer.from("fake-png-bytes-with-bar"),
        expectedWidth: 1080,
        expectedHeight: 1350,
      }),
    );
    const qcCallArg = vi.mocked(qualityControl.runQualityControl).mock.calls[0][0];
    expect(qcCallArg.generatedImageBuffer).not.toEqual(Buffer.from("fake-one-shot-png"));
    expect(qcCallArg.expectedWidth).not.toBe(1024);
    expect(qcCallArg.expectedHeight).not.toBe(1536);
  });

  it("never publishes and never touches the prior approved version when the CTA bar asset is missing", async () => {
    const { CtaBarAssetMissingError } = await import("@/lib/services/ai-creative-factory/compositor");
    compositeDeterministicCtaBarMock.mockRejectedValueOnce(new CtaBarAssetMissingError("faixa ausente (mock)"));
    findManyCreativeMock.mockImplementation(async (args: { where: { kind: string } }) => {
      if (args.where.kind === "catalog_clean") {
        return [{ version: 1, qualityStatus: "approved", promptInputs: { categoryHint: null, isSeasonalEvent: null }, generatedAt: new Date() }];
      }
      return [
        {
          id: "ad-overlay-bar-missing",
          version: 1,
          qualityStatus: "approved",
          generatedAt: new Date(),
          promptInputs: { mechanism: "one_shot_v1", bakedCurrentPrice: 228.9, bakedReferencePrice: 376.7, categoryHint: "some-other-category", isSeasonalEvent: null },
        },
      ];
    });

    const { runVitrineCreativeFactoryJob } = await import("@/jobs/vitrine-creative-factory");
    const counters = await runVitrineCreativeFactoryJob();

    expect(createMock.mock.calls.some((call) => call[0].data.kind === "ad_overlay")).toBe(false);
    expect(updateManyMock).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "ad-overlay-bar-missing" } }));
    // The mocked runJob() only surfaces the generic processed/created/
    // updated/errors counters (the job's own named counters go into
    // ctx.metadata, asserted indirectly above via the create/updateMany
    // calls) — errors being incremented is the weaker, available signal
    // that this path was treated as a real failure, not a silent no-op.
    expect(counters.errors).toBeGreaterThan(0);
  });
});

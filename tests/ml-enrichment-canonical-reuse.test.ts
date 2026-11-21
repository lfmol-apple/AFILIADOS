import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner's directive, 2026-11-21 ("Produtos Philco — aprovado com
 * restrições"): proves the REAL effect of the reuse-or-review logic
 * added to enrichCatalogListing (lib/services/ml-enrichment-collector.ts)
 * — not just that canonical-product-equivalence.ts's pure function is
 * correct in isolation (already covered by
 * tests/canonical-product-equivalence.test.ts), but that the ingestion
 * code actually calls it and acts on the verdict: reuses an existing
 * canonical only on confirmed equivalence, creates a new one (and logs a
 * review row) otherwise. `getCatalogProductItems` is mocked to return []
 * so the per-offer loop (seller reputation, monetization score, etc. —
 * unrelated to this change) never runs, isolating the test to the
 * canonical-resolution logic itself.
 */

const findUniqueMock = vi.fn();
const findManyMock = vi.fn();
const findUniqueOrThrowMock = vi.fn();
const updateMock = vi.fn();
const createMock = vi.fn();
const mergeReviewUpsertMock = vi.fn();
const merchantListingUpdateMock = vi.fn(async () => ({}));

vi.mock("@/lib/db", () => ({
  prisma: {
    canonicalProduct: {
      findUnique: findUniqueMock,
      findMany: findManyMock,
      findUniqueOrThrow: findUniqueOrThrowMock,
      update: updateMock,
      create: createMock,
    },
    canonicalProductMergeReview: {
      upsert: mergeReviewUpsertMock,
    },
    category: {
      findMany: vi.fn(async () => []),
    },
    merchantListing: {
      update: merchantListingUpdateMock,
    },
  },
}));

function fakeDetail(overrides: { voltage?: string; color?: string }) {
  return {
    name: "Secador De Cabelos Philco psc3500 4 Em 1",
    domain_id: "MLB-HAIR_DRYERS",
    family_name: null,
    pictures: [],
    attributes: [
      { id: "BRAND", value_name: "Philco" },
      { id: "MODEL", value_name: "PSC3500" },
      { id: "COLOR", value_name: overrides.color ?? "Bege" },
      { id: "VOLTAGE", value_name: overrides.voltage ?? "127V" },
    ],
  };
}

describe("enrichCatalogListing — reuse-or-review for a never-before-seen catalogProductId", () => {
  beforeEach(() => {
    vi.resetModules();
    findUniqueMock.mockReset();
    findManyMock.mockReset();
    findUniqueOrThrowMock.mockReset();
    updateMock.mockReset();
    createMock.mockReset();
    mergeReviewUpsertMock.mockReset();
    findUniqueMock.mockResolvedValue(null); // no CanonicalProduct with this exact catalogProductId's slug yet
    merchantListingUpdateMock.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fakeProvider = (detail: ReturnType<typeof fakeDetail>) => ({
    getCatalogProductDetail: vi.fn(async () => detail),
    getCatalogProductItems: vi.fn(async () => []),
  });

  it("the real Philco case: existing canonical has a CONFLICTING voltage → creates a NEW canonical and logs a confirmed_distinct_variant review, never reuses", async () => {
    findManyMock.mockResolvedValue([
      { id: "canonical-127v", brand: "Philco", model: "PSC3500", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } },
    ]);
    createMock.mockResolvedValue({ id: "canonical-220v-new" });

    const { enrichCatalogListing } = await import("@/lib/services/ml-enrichment-collector");
    const detail220v = fakeDetail({ voltage: "220V" });
    await enrichCatalogListing(
      fakeProvider(detail220v) as never,
      "merchant-1",
      { id: "listing-1", externalId: "MLB50269368", canonicalProductId: null },
      50,
      new Map(),
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled(); // never touches the existing 127V canonical's own row
    expect(mergeReviewUpsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = mergeReviewUpsertMock.mock.calls[0]![0];
    expect(upsertArgs.create.verdict).toBe("confirmed_distinct_variant");
    expect(upsertArgs.create.existingCanonicalProductId).toBe("canonical-127v");
    expect(upsertArgs.create.newCatalogProductId).toBe("MLB50269368");
  });

  it("reuses the existing canonical when a variant attribute genuinely CONFIRMS equivalence (same COLOR+VOLTAGE)", async () => {
    findManyMock.mockResolvedValue([
      { id: "canonical-existing", brand: "Philco", model: "PSC3500", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } },
    ]);
    findUniqueOrThrowMock.mockResolvedValue({ id: "canonical-existing", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } });
    updateMock.mockResolvedValue({ id: "canonical-existing" });

    const { enrichCatalogListing } = await import("@/lib/services/ml-enrichment-collector");
    const sameVoltageDetail = fakeDetail({ voltage: "127V", color: "Bege" });
    await enrichCatalogListing(
      fakeProvider(sameVoltageDetail) as never,
      "merchant-1",
      { id: "listing-2", externalId: "MLB-ANOTHER-REAL-LISTING", canonicalProductId: null },
      50,
      new Map(),
    );

    expect(createMock).not.toHaveBeenCalled(); // never creates a duplicate canonical
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "canonical-existing" },
        data: expect.objectContaining({
          specifications: expect.objectContaining({
            alsoKnownAsCatalogProductIds: ["MLB-ANOTHER-REAL-LISTING"],
          }),
        }),
      }),
    );
    expect(mergeReviewUpsertMock).not.toHaveBeenCalled(); // a confirmed reuse needs no human review
  });

  it("never merges on brand+model alone when there is no shared variant-attribute data — ambiguous, logs for review, creates new canonical", async () => {
    findManyMock.mockResolvedValue([
      { id: "canonical-no-attrs", brand: "Tssaper", model: "TP550", specifications: { variantAttributes: {} } },
    ]);
    createMock.mockResolvedValue({ id: "canonical-new-tssaper" });

    const detailNoOverlap = {
      name: "Pistola Tssaper TP550",
      domain_id: "MLB-PAINT_SPRAYERS",
      family_name: null,
      pictures: [],
      attributes: [
        { id: "BRAND", value_name: "Tssaper" },
        { id: "MODEL", value_name: "TP550" },
      ],
    };

    const { enrichCatalogListing } = await import("@/lib/services/ml-enrichment-collector");
    await enrichCatalogListing(
      fakeProvider(detailNoOverlap as never) as never,
      "merchant-1",
      { id: "listing-3", externalId: "MLB-SECOND-TSSAPER-LISTING", canonicalProductId: null },
      50,
      new Map(),
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(mergeReviewUpsertMock).toHaveBeenCalledTimes(1);
    expect(mergeReviewUpsertMock.mock.calls[0]![0].create.verdict).toBe("ambiguous_no_attribute_overlap");
  });

  it("preserves the real catalogProductId and the listing's own traceable link on reuse — never rewrites externalId, only points canonicalProductId at the shared canonical", async () => {
    findManyMock.mockResolvedValue([
      { id: "canonical-existing", brand: "Philco", model: "PSC3500", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } },
    ]);
    findUniqueOrThrowMock.mockResolvedValue({ id: "canonical-existing", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } });
    updateMock.mockResolvedValue({ id: "canonical-existing" });

    const { enrichCatalogListing } = await import("@/lib/services/ml-enrichment-collector");
    const sameVoltageDetail = fakeDetail({ voltage: "127V", color: "Bege" });
    await enrichCatalogListing(
      fakeProvider(sameVoltageDetail) as never,
      "merchant-1",
      { id: "listing-2", externalId: "MLB-ANOTHER-REAL-LISTING", canonicalProductId: null },
      50,
      new Map(),
    );

    // The real ML catalogProductId (externalId) is never touched — only the
    // foreign key to the (now shared) canonical changes, by this listing's
    // own real database id, never by externalId or any other identifier.
    expect(merchantListingUpdateMock).toHaveBeenCalledTimes(1);
    expect(merchantListingUpdateMock).toHaveBeenCalledWith({
      where: { id: "listing-2" },
      data: { canonicalProductId: "canonical-existing" },
    });
  });

  it("repeated enrichment cycles for the same still-unresolved pair target the same review row (upsert key is stable) — never accumulates duplicate review rows or risks a unique-constraint conflict", async () => {
    findManyMock.mockResolvedValue([
      { id: "canonical-127v", brand: "Philco", model: "PSC3500", specifications: { variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } } },
    ]);
    createMock.mockResolvedValue({ id: "canonical-220v-new" });

    const { enrichCatalogListing } = await import("@/lib/services/ml-enrichment-collector");
    const detail220v = fakeDetail({ voltage: "220V" });
    const runOnce = () =>
      enrichCatalogListing(
        fakeProvider(detail220v) as never,
        "merchant-1",
        { id: "listing-1", externalId: "MLB50269368", canonicalProductId: null },
        50,
        new Map(),
      );

    await runOnce();
    await runOnce(); // simulates the next real 4h ingestion cycle, still unresolved

    expect(mergeReviewUpsertMock).toHaveBeenCalledTimes(2);
    const firstKey = mergeReviewUpsertMock.mock.calls[0]![0].where.existingCanonicalProductId_newCatalogProductId;
    const secondKey = mergeReviewUpsertMock.mock.calls[1]![0].where.existingCanonicalProductId_newCatalogProductId;
    expect(secondKey).toEqual(firstKey); // same unique-constraint key both times — an update, never a second row
    expect(createMock).toHaveBeenCalledTimes(2); // each cycle still creates its own canonical for this catalogProductId (unchanged pre-existing per-cycle behavior), independent of the review log
  });
});

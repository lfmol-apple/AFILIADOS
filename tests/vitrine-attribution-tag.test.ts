import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createVitrine,
  activateVitrine,
  claimSelectionForVitrine,
  resolveAttributionTagForListing,
  getLegacyVitrineId,
  DuplicateAttributionTagError,
  LEGACY_VITRINE_SLUG,
} from "@/lib/services/vitrine-manager";
import { registerVitrineLink } from "@/lib/services/vitrine-link-register";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Owner's directive, 2026-11-25 ("investigue e corrija imediatamente o
 * problema do attributionTag, pois esse campo é estratégico para a
 * implantação da segunda vitrine e para a separação comercial entre
 * vitrines"). Real root cause (confirmed by reproducing on `main` before
 * any change here): the local dev database's "Vitrine" table had an
 * `attributionTag` column, added by an undocumented `prisma db push` at
 * some earlier point, that existed in NEITHER schema.prisma NOR any
 * committed migration — production's own table never had it at all
 * (confirmed by reading it directly, read-only, over SSH). The fix:
 * migration 20261125120000_vitrine_attribution_tag properly adds the
 * column (nullable → backfill the one real "Vitrine Geral" row with its
 * existing "vitrinedinamica" tag → NOT NULL + unique), and
 * createVitrine() now requires and persists it for real.
 */

const TEST_PREFIX = "vattr-test-";

function testVitrineInput(suffix: string, attributionTag?: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    slug: `${TEST_PREFIX}${suffix}-${unique}`,
    name: `Vitrine ${suffix} (teste)`,
    attributionTag: attributionTag ?? `${TEST_PREFIX}attr-${suffix}-${unique}`,
  };
}

describe("Vitrine.attributionTag — real database integration (local dev DB)", () => {
  afterEach(async () => {
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("creates a new vitrine with its own real attributionTag", async () => {
    const input = testVitrineInput("nova");
    const vitrine = await createVitrine(input);
    expect(vitrine.attributionTag).toBe(input.attributionTag);

    const reloaded = await prisma.vitrine.findUniqueOrThrow({ where: { id: vitrine.id } });
    expect(reloaded.attributionTag).toBe(input.attributionTag);
  });

  it("preserves the ORIGINAL vitrine's attributionTag exactly as 'vitrinedinamica' — never touched by this fix", async () => {
    const legacy = await prisma.vitrine.findUniqueOrThrow({ where: { slug: LEGACY_VITRINE_SLUG } });
    expect(legacy.attributionTag).toBe("vitrinedinamica");
  });

  it("creating two vitrines simultaneously with distinct tags never collides (real concurrent writes, not sequential)", async () => {
    const inputA = testVitrineInput("sim-a");
    const inputB = testVitrineInput("sim-b");
    const [a, b] = await Promise.all([createVitrine(inputA), createVitrine(inputB)]);
    expect(a.attributionTag).toBe(inputA.attributionTag);
    expect(b.attributionTag).toBe(inputB.attributionTag);
    expect(a.attributionTag).not.toBe(b.attributionTag);
  });

  it("prevents a duplicate attributionTag across two different vitrines — the real unique index decides, not application logic", async () => {
    const sharedTag = `${TEST_PREFIX}dup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const first = await createVitrine(testVitrineInput("dup-first", sharedTag));
    expect(first.attributionTag).toBe(sharedTag);

    await expect(createVitrine(testVitrineInput("dup-second", sharedTag))).rejects.toBeInstanceOf(DuplicateAttributionTagError);

    // The first vitrine's row must be completely untouched by the failed attempt.
    const stillThere = await prisma.vitrine.findUniqueOrThrow({ where: { id: first.id } });
    expect(stillThere.attributionTag).toBe(sharedTag);
  });

  it("two DIFFERENT real vitrines can coexist with two different tags — isolation, not a global singleton", async () => {
    const a = await createVitrine(testVitrineInput("iso-a"));
    const b = await createVitrine(testVitrineInput("iso-b"));
    const rows = await prisma.vitrine.findMany({ where: { id: { in: [a.id, b.id] } } });
    const tags = rows.map((r) => r.attributionTag).sort();
    expect(tags).toEqual([a.attributionTag, b.attributionTag].sort());
  });

  function fakeCandidate(merchantListingId: string, canonicalProductId: string): VitrineCandidate {
    return {
      merchantListingId,
      canonicalProductId,
      title: "Produto Teste (fixture)",
      score: 70,
      rankingScore: 70,
      group: "recorrente",
      reason: "Fixture de teste.",
      scoreBreakdown: { score: 70, confidence: 1, rankingScore: 70, components: {}, reasons: [], degradedDimensions: [] } as unknown as VitrineCandidate["scoreBreakdown"],
      matchedEventName: null,
      matchedKeyword: null,
      commissionEvidence: { type: "unknown", rate: null, estimatedValueBrl: null, stale: false },
      priceCompetitiveness: { score: null, siblingOfferCount: 0, hasConfirmedPriceDrop: false },
      adPotentialHypothesis: { impulseFit: "moderado", impulseFitReason: "", offerClarity: "clara", offerClarityReason: "", hasVisibleDiscountHook: false, note: "" },
      categoryId: null,
      commercialAudit: { verdict: "aprovado", reasons: [] } as unknown as VitrineCandidate["commercialAudit"],
      salesEvidenceType: "official_rank",
    };
  }

  async function makeListingFixture(suffix: string) {
    const merchant = await prisma.merchant.upsert({
      where: { code: "MERCADO_LIVRE" },
      create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
      update: {},
    });
    const canonical = await prisma.canonicalProduct.create({
      data: { slug: `${TEST_PREFIX}canonical-${suffix}-${Date.now()}`, title: `${TEST_PREFIX}Produto ${suffix}` },
    });
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: merchant.id,
        canonicalProductId: canonical.id,
        externalId: `${TEST_PREFIX}ext-${suffix}-${Date.now()}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://example.com/${suffix}`,
        active: true,
      },
    });
    return { merchant, canonical, listing };
  }

  it("real end-to-end fix, 2026-11-26 (recovered + reconciled from feat/vitrine-segunda): a listing ACTIVE in a non-legacy vitrine gets THAT vitrine's own tag in the real saved VitrineLink, never the legacy one", async () => {
    const second = await createVitrine(testVitrineInput("segunda"));
    await activateVitrine(second.id);
    const { canonical, listing } = await makeListingFixture("second");
    await claimSelectionForVitrine(second.id, [fakeCandidate(listing.id, canonical.id)]);

    const resolvedTag = await resolveAttributionTagForListing(listing.id);
    expect(resolvedTag).toBe(second.attributionTag);
    expect(resolvedTag).not.toBe("vitrinedinamica");

    const saved = await registerVitrineLink({ merchantListingId: listing.id, affiliateUrl: "https://mercadolivre.com/sec/fixture-test" });
    expect(saved.merchantListingId).toBe(listing.id);

    const link = await prisma.vitrineLink.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.attributionTag).toBe(second.attributionTag);
    expect(link?.attributionTag).not.toBe("vitrinedinamica");

    // Selection rows reference the Vitrine by FK (no cascade) — must be
    // cleared before this file's afterEach deletes the test Vitrine itself.
    await prisma.vitrineLink.deleteMany({ where: { merchantListingId: listing.id } });
    await prisma.vitrineSelection.deleteMany({ where: { vitrineId: second.id } });
    await prisma.merchantListing.deleteMany({ where: { id: listing.id } });
    await prisma.canonicalProduct.deleteMany({ where: { id: canonical.id } });
  });

  it("a listing ACTIVE in the real legacy vitrine still gets the real, unchanged 'vitrinedinamica' tag through the same real path — no regression for the 17 existing products", async () => {
    const legacyVitrineId = await getLegacyVitrineId();
    const { canonical, listing } = await makeListingFixture("legacy");
    await claimSelectionForVitrine(legacyVitrineId, [fakeCandidate(listing.id, canonical.id)]);

    const resolvedTag = await resolveAttributionTagForListing(listing.id);
    expect(resolvedTag).toBe("vitrinedinamica");

    const saved = await registerVitrineLink({ merchantListingId: listing.id, affiliateUrl: "https://mercadolivre.com/sec/fixture-test-legacy" });
    const link = await prisma.vitrineLink.findUnique({ where: { merchantListingId: saved.merchantListingId } });
    expect(link?.attributionTag).toBe("vitrinedinamica");

    // Clean up the real legacy vitrine's own selection row this test
    // created — never left as live clutter alongside the real 17+
    // active products.
    await prisma.vitrineLink.deleteMany({ where: { merchantListingId: listing.id } });
    await prisma.vitrineSelection.deleteMany({ where: { vitrineId: legacyVitrineId, merchantListingId: listing.id } });
    await prisma.merchantListing.deleteMany({ where: { id: listing.id } });
    await prisma.canonicalProduct.deleteMany({ where: { id: canonical.id } });
  });

  it("resolveAttributionTagForListing throws, never silently defaults, for a listing not ACTIVE in any vitrine", async () => {
    const { canonical, listing } = await makeListingFixture("orphan");
    await expect(resolveAttributionTagForListing(listing.id)).rejects.toThrow();
    await prisma.merchantListing.deleteMany({ where: { id: listing.id } });
    await prisma.canonicalProduct.deleteMany({ where: { id: canonical.id } });
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createVitrine,
  activateVitrine,
  pauseVitrine,
  endVitrine,
  claimSelectionForVitrine,
  VitrineTransitionError,
} from "@/lib/services/vitrine-manager";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", section 4: "implementar a regra de exclusividade de
 * maneira transacional e resistente a concorrência"). Real integration
 * tests against the local dev database — never production, never the
 * real 37 pre-existing VitrineSelection rows (a unique test-only
 * Merchant/CanonicalProduct/MerchantListing fixture is created and torn
 * down each run). Proves the PARTIAL UNIQUE INDEX
 * (VitrineSelection_active_canonicalProductId_key,
 * prisma/migrations/20261122153228_multi_vitrine_core) — not an
 * application-level check — is what actually decides a real race.
 */

const TEST_PREFIX = "vmgr-test-";

function fakeCandidate(merchantListingId: string, canonicalProductId: string, score: number): VitrineCandidate {
  return {
    merchantListingId,
    canonicalProductId,
    title: "Produto Teste (fixture)",
    score,
    rankingScore: score,
    group: "recorrente",
    reason: "Fixture de teste.",
    scoreBreakdown: { score, confidence: 1, rankingScore: score, components: {}, reasons: [], degradedDimensions: [] } as unknown as VitrineCandidate["scoreBreakdown"],
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

async function makeSharedCanonicalProductFixture() {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `${TEST_PREFIX}canonical-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: "Produto fixture de teste (vitrine-manager)",
    },
  });
  // Two REAL, distinct MerchantListing rows (different sellers/externalIds)
  // pointed at the SAME canonical product — the real Philco 127V/220V
  // shape confirmed earlier this session: two different listings, one
  // real underlying product.
  const listingA = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}ext-a-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/a",
    },
  });
  const listingB = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}ext-b-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/b",
    },
  });
  return { canonical, listingA, listingB };
}

describe("vitrine-manager — real transactional cross-vitrine exclusivity (local dev DB)", () => {
  afterEach(async () => {
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("a second vitrine loses the real race for the SAME canonical product (different listing id) — Postgres decides, not application logic", async () => {
    const { canonical, listingA, listingB } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    const vitrineB = await createVitrine({ slug: `${TEST_PREFIX}b-${Date.now()}`, name: "Vitrine B (teste)" });
    await activateVitrine(vitrineA.id);
    await activateVitrine(vitrineB.id);

    const resultA = await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);
    expect(resultA.claimed).toHaveLength(1);
    expect(resultA.lostRace).toHaveLength(0);

    // Vitrine B tries to claim a DIFFERENT real listing of the SAME real
    // product — must lose, proving exclusivity is keyed on the
    // canonical product, never just the listing id.
    const resultB = await claimSelectionForVitrine(vitrineB.id, [fakeCandidate(listingB.id, canonical.id, 90)]);
    expect(resultB.claimed).toHaveLength(0);
    expect(resultB.lostRace).toHaveLength(1);

    const activeRows = await prisma.vitrineSelection.findMany({ where: { canonicalProductId: canonical.id, status: "ACTIVE" } });
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]!.vitrineId).toBe(vitrineA.id);
  });

  it("real root cause fixed, 2026-11-22 (reavaliação do ciclo de vida): PAUSING a vitrine NEVER releases its products — another vitrine still loses the race for the same canonical product", async () => {
    const { canonical, listingA, listingB } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    const vitrineB = await createVitrine({ slug: `${TEST_PREFIX}b-${Date.now()}`, name: "Vitrine B (teste)" });
    await activateVitrine(vitrineA.id);
    await activateVitrine(vitrineB.id);

    await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);

    const { releasedCount, vitrine: paused } = await pauseVitrine(vitrineA.id);
    expect(releasedCount).toBe(0); // the real fix: pause releases nothing
    expect(paused.status).toBe("PAUSED");

    const stillBlocked = await claimSelectionForVitrine(vitrineB.id, [fakeCandidate(listingB.id, canonical.id, 90)]);
    expect(stillBlocked.lostRace).toHaveLength(1); // still reserved for A, even while paused

    const row = await prisma.vitrineSelection.findUnique({
      where: { vitrineId_merchantListingId: { vitrineId: vitrineA.id, merchantListingId: listingA.id } },
    });
    expect(row?.status).toBe("ACTIVE"); // never touched by the pause
  });

  it("reactivating a PAUSED vitrine needs zero re-claim — its products were never released", async () => {
    const { canonical, listingA } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    await activateVitrine(vitrineA.id);
    await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);

    await pauseVitrine(vitrineA.id);
    const reactivated = await activateVitrine(vitrineA.id);
    expect(reactivated.status).toBe("ACTIVE");

    const row = await prisma.vitrineSelection.findUnique({
      where: { vitrineId_merchantListingId: { vitrineId: vitrineA.id, merchantListingId: listingA.id } },
    });
    expect(row?.status).toBe("ACTIVE"); // still there, never needed re-claiming
  });

  it("ENDING a vitrine (not pausing) is the real, intentional release point — only then can another vitrine claim the same product", async () => {
    const { canonical, listingA, listingB } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    const vitrineB = await createVitrine({ slug: `${TEST_PREFIX}b-${Date.now()}`, name: "Vitrine B (teste)" });
    await activateVitrine(vitrineA.id);
    await activateVitrine(vitrineB.id);
    await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);

    const { releasedCount } = await endVitrine(vitrineA.id);
    expect(releasedCount).toBe(1);

    const afterEnd = await claimSelectionForVitrine(vitrineB.id, [fakeCandidate(listingB.id, canonical.id, 90)]);
    expect(afterEnd.claimed).toHaveLength(1); // now genuinely free

    const releasedRow = await prisma.vitrineSelection.findUnique({
      where: { vitrineId_merchantListingId: { vitrineId: vitrineA.id, merchantListingId: listingA.id } },
    });
    expect(releasedRow?.status).toBe("RETIRED");
    expect(releasedRow?.retiredReason).toMatch(/encerrada/);
  });

  it("an ENDED vitrine can never be reactivated", async () => {
    const vitrine = await createVitrine({ slug: `${TEST_PREFIX}ended-${Date.now()}`, name: "Vitrine encerrada (teste)" });
    await activateVitrine(vitrine.id);
    await endVitrine(vitrine.id);
    await expect(activateVitrine(vitrine.id)).rejects.toThrow(VitrineTransitionError);
  });

  it("a claim attempt for a non-ACTIVE vitrine (DRAFT or PAUSED) is rejected before any write — never silently acquires a new product while not running", async () => {
    const { canonical, listingA } = await makeSharedCanonicalProductFixture();
    const draft = await createVitrine({ slug: `${TEST_PREFIX}draft-${Date.now()}`, name: "Vitrine rascunho (teste)" });
    await expect(claimSelectionForVitrine(draft.id, [fakeCandidate(listingA.id, canonical.id, 80)])).rejects.toThrow(VitrineTransitionError);

    const paused = await createVitrine({ slug: `${TEST_PREFIX}paused-${Date.now()}`, name: "Vitrine pausada (teste)" });
    await activateVitrine(paused.id);
    await pauseVitrine(paused.id);
    await expect(claimSelectionForVitrine(paused.id, [fakeCandidate(listingA.id, canonical.id, 80)])).rejects.toThrow(VitrineTransitionError);
  });

  it("concurrency-resistant transition: two concurrent attempts to end the SAME vitrine never both report success, and never double-release", async () => {
    const { canonical, listingA } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    await activateVitrine(vitrineA.id);
    await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);

    const [first, second] = await Promise.allSettled([endVitrine(vitrineA.id), endVitrine(vitrineA.id)]);
    const results = [first, second];
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1); // exactly one call actually transitioned it
    expect(failed).toHaveLength(1);
    if (succeeded[0]!.status === "fulfilled") {
      expect(succeeded[0]!.value.releasedCount).toBe(1); // released exactly once, never twice
    }
  });

  it("ending a vitrine releases its products the same way pausing does", async () => {
    const { canonical, listingA } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    await activateVitrine(vitrineA.id);
    await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);

    const { vitrine, releasedCount } = await endVitrine(vitrineA.id);
    expect(releasedCount).toBe(1);
    expect(vitrine.status).toBe("ENDED");
    expect(vitrine.endedAt).not.toBeNull();
  });

  it("an already-ACTIVE vitrine cannot be activated again", async () => {
    const vitrine = await createVitrine({ slug: `${TEST_PREFIX}once-${Date.now()}`, name: "Vitrine única (teste)" });
    await activateVitrine(vitrine.id);
    await expect(activateVitrine(vitrine.id)).rejects.toThrow(VitrineTransitionError);
  });

  it("the same listing CAN be re-claimed by the SAME vitrine (upsert, not a conflict with itself)", async () => {
    const { canonical, listingA } = await makeSharedCanonicalProductFixture();
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine A (teste)" });
    await activateVitrine(vitrineA.id);

    const first = await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 80)]);
    expect(first.claimed).toHaveLength(1);
    const second = await claimSelectionForVitrine(vitrineA.id, [fakeCandidate(listingA.id, canonical.id, 85)]);
    expect(second.claimed).toHaveLength(1); // refresh, not a race loss
    expect(second.lostRace).toHaveLength(0);
  });
});

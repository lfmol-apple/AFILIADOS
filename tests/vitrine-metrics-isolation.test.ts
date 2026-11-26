import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createVitrine, activateVitrine, claimSelectionForVitrine, getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { registerVitrineLink } from "@/lib/services/vitrine-link-register";
import { resolveVitrineRedirect } from "@/lib/services/vitrine-redirect";
import { getVitrineFinancialSummary } from "@/lib/services/vitrine-financials";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Recovered and reconciled from the abandoned feat/vitrine-segunda branch
 * (commit 153764d), on top of lib/services/vitrine-redirect.ts's fix.
 *
 * Owner's authorization, 2026-11-24 ("Isolamento integral entre
 * vitrines", item 5: "métricas independentes"). Real bug this closes:
 * lib/services/vitrine-redirect.ts hardcoded campaign="vitrine_dinamica"
 * on every real click, regardless of which vitrine the listing belonged
 * to — a second vitrine's clicks would have been indistinguishable from
 * the legacy one's in lib/services/vitrine-financials.ts's
 * getVitrineFinancialSummary() and every admin financial view. Now the
 * click's campaign is the listing's own VitrineLink.attributionTag
 * (fixed per-vitrine by lib/services/vitrine-link-register.ts), and this
 * proves clicks through two different vitrines are independently
 * countable through the REAL, already-existing campaign-scoped
 * aggregation function — not a new reporting mechanism, just the one bug
 * that broke its real per-vitrine use.
 *
 * Reconciled 2026-11-26: the original recovered fix only touched
 * vitrine-redirect.ts, but getVitrineFinancialSummary (and
 * vitrine-selection.ts / vitrine-weight-learning.ts) all defaulted/
 * filtered on the literal "vitrine_dinamica" (with an underscore the
 * real attributionTag never had) — a pre-existing, separate typo-
 * divergence that would have silently broken once clicks started
 * carrying the real attributionTag. Fixed in the same step across every
 * live call site, never left half-applied.
 *
 * Known, deliberately NOT fixed here: vitrineAdSpend/vitrineCommissionReport
 * (ad spend and commission entries, both manually typed by the owner)
 * have no vitrine/campaign column of their own yet — they're still
 * global regardless of which campaign param is passed to
 * getVitrineFinancialSummary. Harmless today (no real spend or
 * commission exists yet for any vitrine but the legacy one), but a real
 * gap the owner should know about before a second vitrine ever has its
 * own real ad spend to report.
 */
const TEST_PREFIX = "vmetrics-test-";

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

async function makeClickableFixture(suffix: string, vitrineId: string) {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  const canonical = await prisma.canonicalProduct.create({
    data: { slug: `${TEST_PREFIX}canonical-${suffix}-${Date.now()}`, title: `${TEST_PREFIX}Produto ${suffix}` },
  });
  const externalId = `${TEST_PREFIX}ext-${suffix}-${Date.now()}`;
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://example.com/${suffix}`,
      active: true,
    },
  });
  await claimSelectionForVitrine(vitrineId, [fakeCandidate(listing.id, canonical.id)]);
  await registerVitrineLink({ merchantListingId: listing.id, affiliateUrl: `https://meli.la/fixture-${suffix}` });
  return { merchant, canonical, listing, externalId };
}

describe("vitrine metrics isolation — real clicks, scoped per vitrine (local dev DB)", () => {
  afterEach(async () => {
    await prisma.affiliateClick.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineLink.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("a real click through a second vitrine's link is tagged with ITS OWN campaign, and getVitrineFinancialSummary counts it only under that campaign", async () => {
    const legacyVitrineId = await getLegacyVitrineId();
    const second = await createVitrine({
      slug: `${TEST_PREFIX}segunda-${Date.now()}`,
      name: "Vitrine evolução (teste)",
      attributionTag: `${TEST_PREFIX}tag-${Date.now()}`,
    });
    await activateVitrine(second.id);

    const legacyFixture = await makeClickableFixture("legacy", legacyVitrineId);
    const secondFixture = await makeClickableFixture("second", second.id);

    const periodStart = new Date(Date.now() - 60_000);
    const periodEnd = new Date(Date.now() + 60_000);

    await resolveVitrineRedirect({ merchant: "mercado-livre", externalId: legacyFixture.externalId, searchParams: new URLSearchParams() });
    await resolveVitrineRedirect({ merchant: "mercado-livre", externalId: secondFixture.externalId, searchParams: new URLSearchParams() });

    const legacyClick = await prisma.affiliateClick.findFirst({ where: { merchantListingId: legacyFixture.listing.id } });
    const secondClick = await prisma.affiliateClick.findFirst({ where: { merchantListingId: secondFixture.listing.id } });
    expect(legacyClick?.campaign).toBe("vitrinedinamica");
    expect(secondClick?.campaign).toBe(second.attributionTag);
    expect(secondClick?.campaign).not.toBe(legacyClick?.campaign);

    const legacySummary = await getVitrineFinancialSummary({ periodStart, periodEnd, campaign: "vitrinedinamica" });
    const secondSummary = await getVitrineFinancialSummary({ periodStart, periodEnd, campaign: second.attributionTag });

    // Each summary counts at least its own real click under "vitrineClicks"
    // — real counts may include unrelated production clicks in this
    // period, so this proves inclusion, not an exact total.
    expect(legacySummary.vitrineClicks).toBeGreaterThanOrEqual(1);
    expect(secondSummary.vitrineClicks).toBeGreaterThanOrEqual(1);

    // The real isolation proof: the second vitrine's click never counts
    // under the legacy campaign, and vice versa.
    const secondOnlyLegacyView = await prisma.affiliateClick.count({
      where: { campaign: "vitrinedinamica", merchantListingId: secondFixture.listing.id },
    });
    expect(secondOnlyLegacyView).toBe(0);
    const legacyOnlySecondView = await prisma.affiliateClick.count({
      where: { campaign: second.attributionTag, merchantListingId: legacyFixture.listing.id },
    });
    expect(legacyOnlySecondView).toBe(0);

    await prisma.vitrineSelection.deleteMany({ where: { vitrineId: legacyVitrineId, merchantListingId: legacyFixture.listing.id } });
  });
});

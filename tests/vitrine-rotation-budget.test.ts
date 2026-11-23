import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { countRecentCommercialSwaps } from "@/lib/services/vitrine-rotation-budget";

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * correção do orçamento de rotação). Real integration test against the
 * local dev DB, proving the exact real bug is fixed: a burst of
 * development/testing runs (or any row never classified as a genuine
 * engine swap) must never consume the real weekly commercial rotation
 * budget.
 */
const TEST_VITRINE_ID = "vitrine-geral-original";
const TEST_PREFIX = "teste-orcamento-rotacao-";

async function seedListing(externalId: string) {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre" },
    update: {},
  });
  return prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      externalId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: `https://example.com/${externalId}`,
      source: "MANUAL_VERIFIED",
    },
  });
}

describe("countRecentCommercialSwaps", () => {
  afterEach(async () => {
    await prisma.vitrineSelection.deleteMany({ where: { reason: { contains: TEST_PREFIX } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
  });

  it("never counts a row with no activationSource (legacy / unclassified), even with a recent activatedAt", async () => {
    const listing = await seedListing(`${TEST_PREFIX}legacy`);
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "ACTIVE",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}sem classificação`,
        activatedAt: new Date(),
        activationSource: null,
      },
    });
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBe(0);
  });

  it("never counts a row explicitly classified as pre_production_testing", async () => {
    const listing = await seedListing(`${TEST_PREFIX}dev`);
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "ACTIVE",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}burst de teste`,
        activatedAt: new Date(),
        activationSource: "pre_production_testing",
      },
    });
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBe(0);
  });

  it("DOES count a row genuinely classified as engine_commercial_swap", async () => {
    const listing = await seedListing(`${TEST_PREFIX}real`);
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "ACTIVE",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}troca comercial real`,
        activatedAt: new Date(),
        activationSource: "engine_commercial_swap",
      },
    });
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("never counts an engine_commercial_swap row OUTSIDE the lookback window, even though it would count if recent", async () => {
    const listing = await seedListing(`${TEST_PREFIX}antigo`);
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "RETIRED",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}troca antiga`,
        activatedAt: new Date(Date.now() - 30 * 86_400_000),
        activationSource: "engine_commercial_swap",
      },
    });
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBe(0);
  });
});

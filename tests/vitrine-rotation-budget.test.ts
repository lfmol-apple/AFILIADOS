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

  it("never counts a row explicitly classified as manual_data_correction (reserved value)", async () => {
    const listing = await seedListing(`${TEST_PREFIX}correcao`);
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "ACTIVE",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}correção manual de dados`,
        activatedAt: new Date(),
        activationSource: "manual_data_correction",
      },
    });
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBe(0);
  });

  // Owner's authorization, 2026-11-23 (item 3: "garanta que futuras
  // migrações não consumam o orçamento indevidamente"). A real migration
  // never calls application code — it's raw SQL applied directly to the
  // table (prisma/migrations/*/migration.sql), so the only way a FUTURE
  // migration/backfill could corrupt the budget is by touching
  // `activatedAt` directly, the same way this test does with $executeRaw.
  // Proves the counting function is safe by construction, not by
  // assumption: it opts a row IN only on an exact activationSource
  // match, so any raw-SQL write that doesn't explicitly set that column
  // to 'engine_commercial_swap' can never be counted, no matter what else
  // it changes on the row.
  it("uma migração/backfill futura (SQL bruto) que toque activatedAt sem tocar activationSource nunca é contada", async () => {
    const listing = await seedListing(`${TEST_PREFIX}migracao-futura`);
    const selection = await prisma.vitrineSelection.create({
      data: {
        vitrineId: TEST_VITRINE_ID,
        merchantListingId: listing.id,
        groupType: "recorrente",
        status: "ACTIVE",
        score: 50,
        scoreBreakdown: {},
        reason: `${TEST_PREFIX}linha pré-existente, nunca uma troca real`,
        activatedAt: new Date(Date.now() - 60 * 86_400_000),
        activationSource: null,
      },
    });
    // Simula exatamente o que uma migração/backfill futura faria: SQL
    // bruto mexendo em activatedAt (ex.: normalizar fusos, corrigir dados
    // importados) — nunca passando pelo código da engine, logo nunca
    // define activationSource.
    await prisma.$executeRawUnsafe(
      `UPDATE "VitrineSelection" SET "activatedAt" = NOW() WHERE "id" = $1`,
      selection.id,
    );
    const count = await countRecentCommercialSwaps(new Date(Date.now() - 7 * 86_400_000));
    expect(count).toBe(0);
  });
});

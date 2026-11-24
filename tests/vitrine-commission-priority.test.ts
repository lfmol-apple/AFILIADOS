import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { buildCommissionPriorityQueue } from "@/lib/services/vitrine-commission-priority";
import { recordObservedCommission } from "@/lib/services/vitrine-commission-observation";

/**
 * Owner's directive, 2026-11-24 ("Melhorar a escolha dos produtos... dar
 * mais potência de inteligência"), item 3: a short, prioritized queue for
 * refreshing real commission data, never confusing an offer with its
 * canonical product. Real integration test against the local dev DB.
 */
const TEST_PREFIX = "vcp-test-";

async function makeListing(opts: { canonicalSlug?: string; canonicalId?: string } = {}) {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  let canonicalId = opts.canonicalId;
  if (!canonicalId) {
    const canonical = await prisma.canonicalProduct.create({
      data: {
        slug: opts.canonicalSlug ?? `${TEST_PREFIX}canonical-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: "Produto fixture fila de comissão",
      },
    });
    canonicalId = canonical.id;
  }
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonicalId,
      externalId: `${TEST_PREFIX}ext-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto",
    },
  });
  return { listing, canonicalId };
}

describe("buildCommissionPriorityQueue", () => {
  afterEach(async () => {
    await prisma.merchantListingSignal.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("classifies ACTIVE and RESERVE selections into the right tiers", async () => {
    const vitrineId = await getLegacyVitrineId();
    const { listing: active } = await makeListing();
    const { listing: reserve } = await makeListing();

    await prisma.vitrineSelection.create({
      data: { vitrineId, merchantListingId: active.id, status: "ACTIVE", groupType: "recorrente", score: 80, scoreBreakdown: {}, reason: "fixture ativo" },
    });
    await prisma.vitrineSelection.create({
      data: { vitrineId, merchantListingId: reserve.id, status: "RESERVE", groupType: "recorrente", score: 60, scoreBreakdown: {}, reason: "fixture reserva" },
    });

    const rows = await buildCommissionPriorityQueue(vitrineId);
    const activeRow = rows.find((r) => r.merchantListingId === active.id);
    const reserveRow = rows.find((r) => r.merchantListingId === reserve.id);

    expect(activeRow?.tier).toBe("active");
    expect(reserveRow?.tier).toBe("reserve");
    // Tier order: every "active" row must come before every "reserve" row.
    const activeIdx = rows.findIndex((r) => r.tier === "active" && r.merchantListingId === active.id);
    const reserveIdx = rows.findIndex((r) => r.tier === "reserve" && r.merchantListingId === reserve.id);
    expect(activeIdx).toBeLessThan(reserveIdx);
  });

  it("keeps commission evidence tied to the exact offer, never merged across two listings of the same canonical product", async () => {
    const vitrineId = await getLegacyVitrineId();
    const { listing: listingA, canonicalId } = await makeListing();
    const { listing: listingB } = await makeListing({ canonicalId });

    await prisma.vitrineSelection.create({
      data: { vitrineId, merchantListingId: listingA.id, status: "ACTIVE", groupType: "recorrente", score: 70, scoreBreakdown: {}, reason: "fixture A" },
    });
    await prisma.vitrineSelection.create({
      data: { vitrineId, merchantListingId: listingB.id, status: "ACTIVE", groupType: "recorrente", score: 70, scoreBreakdown: {}, reason: "fixture B" },
    });

    // Only listing A gets a real observed commission.
    await recordObservedCommission({ merchantListingId: listingA.id, rate: 0.08, price: 100 });

    const rows = await buildCommissionPriorityQueue(vitrineId);
    const rowA = rows.find((r) => r.merchantListingId === listingA.id);
    const rowB = rows.find((r) => r.merchantListingId === listingB.id);

    // Row A's evidence comes from allScored only if the pool picked it up;
    // what must hold regardless is that B's evidence was never borrowed
    // from A just because they share a canonical product.
    expect(rowA).toBeDefined();
    expect(rowB).toBeDefined();
    if (rowA && rowB) {
      expect(rowB.commissionEvidence).not.toBe(rowA.commissionEvidence);
    }
  });

  it("never fabricates a row for a merchantListingId with no real externalId on record", async () => {
    const vitrineId = await getLegacyVitrineId();
    const rows = await buildCommissionPriorityQueue(vitrineId);
    for (const row of rows) {
      expect(row.externalId).toBeTruthy();
    }
  });
});

describe("recordObservedCommission", () => {
  afterEach(async () => {
    await prisma.merchantListingSignal.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("writes a panel_pick signal with the real observed rate and price", async () => {
    const { listing } = await makeListing();
    await recordObservedCommission({ merchantListingId: listing.id, rate: 0.12, price: 59.9 });

    const signal = await prisma.merchantListingSignal.findFirst({
      where: { merchantListingId: listing.id, source: "panel_pick" },
    });
    expect(signal).toBeTruthy();
    expect((signal?.raw as { rate: number }).rate).toBe(0.12);
    expect((signal?.raw as { price: number }).price).toBe(59.9);
  });

  it("rejects an out-of-range rate rather than silently storing nonsense", async () => {
    const { listing } = await makeListing();
    await expect(recordObservedCommission({ merchantListingId: listing.id, rate: 1.5, price: 10 })).rejects.toThrow();
  });
});

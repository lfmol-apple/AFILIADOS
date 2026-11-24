import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createVitrine, getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { loadVitrineLinkQueue } from "@/lib/services/vitrine-link-queue";

/**
 * Owner's authorization, 2026-11-22 (Etapa 6, item 6: "garanta que novas
 * vitrines não sejam publicadas vazias por falta de links"). Real
 * integration test against the local dev DB — proves the fix: a pending
 * link from a DIFFERENT vitrine never leaks into another vitrine's own
 * queue, the exact bug class already fixed elsewhere (admin panel, XML
 * route, renewal job) but missed here until now.
 */
const TEST_PREFIX = "vlq-test-";

async function makeFixture() {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `${TEST_PREFIX}canonical-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: "Produto fixture fila de links",
    },
  });
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}ext-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto",
    },
  });
  return { listing };
}

describe("loadVitrineLinkQueue — cross-vitrine isolation", () => {
  afterEach(async () => {
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("never shows another vitrine's pending link in the legacy (Vitrine Geral) queue, or vice versa", async () => {
    const { listing } = await makeFixture();
    const otherVitrine = await createVitrine({ slug: `${TEST_PREFIX}other-${Date.now()}`, name: "Outra vitrine (teste)" });
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: otherVitrine.id,
        merchantListingId: listing.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 50,
        scoreBreakdown: {},
        reason: "fixture",
      },
    });

    const legacyVitrineId = await getLegacyVitrineId();
    const legacyQueue = await loadVitrineLinkQueue(legacyVitrineId);
    expect(legacyQueue.pending.some((p) => p.merchantListingId === listing.id)).toBe(false);

    const otherQueue = await loadVitrineLinkQueue(otherVitrine.id);
    expect(otherQueue.pending.some((p) => p.merchantListingId === listing.id)).toBe(true);
  });
});

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getMlAffiliateQueue } from "@/lib/queries/ml-affiliate-queue";

let merchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

async function makeListing(input: {
  score: number | null;
  hasActiveLink: boolean;
}) {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-QUEUE-${runId}-${listingIds.length}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://www.mercadolivre.com.br/produto/${listingIds.length}`,
    },
  });
  listingIds.push(listing.id);

  if (input.score !== null) {
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: listing.id,
        score: input.score,
        confidence: 0.8,
        components: {},
        reasons: [`score de teste ${input.score}`],
        missingSignals: [],
      },
    });
  }

  if (input.hasActiveLink) {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://mercadolivre.com/sec/already-linked",
        attributionTag: "precocaindo",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  return listing;
}

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  merchantId = merchant.id;
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("getMlAffiliateQueue", () => {
  it("includes a high-score listing with no affiliate link yet", async () => {
    const listing = await makeListing({ score: 80, hasActiveLink: false });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).toContain(listing.id);
    const item = queue.find((i) => i.merchantListingId === listing.id);
    expect(item?.monetizationScore).toBe(80);
  });

  it("excludes a listing that already has an ACTIVE affiliate link", async () => {
    const listing = await makeListing({ score: 90, hasActiveLink: true });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("excludes a listing below the minimum score threshold", async () => {
    const listing = await makeListing({ score: 10, hasActiveLink: false });
    const queue = await getMlAffiliateQueue(50);
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("excludes a listing with no MonetizationScore at all — absence of evidence is not evidence of opportunity", async () => {
    const listing = await makeListing({ score: null, hasActiveLink: false });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("respects a custom minScore threshold", async () => {
    const listing = await makeListing({ score: 60, hasActiveLink: false });
    expect(
      (await getMlAffiliateQueue(70)).map((i) => i.merchantListingId),
    ).not.toContain(listing.id);
    expect(
      (await getMlAffiliateQueue(50)).map((i) => i.merchantListingId),
    ).toContain(listing.id);
  });

  it("a dismissed listing (active: false — POST /api/admin/ml-affiliate-links/dismiss) leaves the queue, same as every other query in the project", async () => {
    const listing = await makeListing({ score: 80, hasActiveLink: false });
    expect((await getMlAffiliateQueue()).map((i) => i.merchantListingId)).toContain(listing.id);

    await prisma.merchantListing.update({ where: { id: listing.id }, data: { active: false } });

    expect((await getMlAffiliateQueue()).map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  describe("Phase 2 — commercial enrichment (scripts/ml-enrich-offers.ts)", () => {
    it("surfaces the best real seller offer's price/condition/seller for an enriched catalog product, and never a fictitious offer for a listing with no real offers", async () => {
      const canonical = await prisma.canonicalProduct.create({
        data: {
          slug: `test-canonical-${runId}`,
          title: "Produto Enriquecido Teste",
          specifications: { catalogProductId: `TEST-CATALOG-${runId}` },
        },
      });

      const catalogListing = await prisma.merchantListing.create({
        data: {
          merchantId,
          externalId: `TEST-CATALOG-${runId}`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: "https://produto.mercadolivre.com.br/catalog-page",
          canonicalProductId: canonical.id,
        },
      });
      listingIds.push(catalogListing.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: catalogListing.id,
          score: 70,
          confidence: 0.6,
          components: {},
          reasons: [],
          missingSignals: [],
        },
      });

      // Two real offers under the same canonical product — a worse one and
      // a better one. The queue must pick the higher-scoring one, never
      // average or fabricate a blended result.
      const worseOffer = await prisma.merchantListing.create({
        data: {
          merchantId,
          externalId: `TEST-OFFER-WORSE-${runId}`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: "https://produto.mercadolivre.com.br/worse-item",
          canonicalProductId: canonical.id,
        },
      });
      listingIds.push(worseOffer.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: worseOffer.id,
          score: 55,
          confidence: 0.5,
          components: {},
          reasons: [],
          missingSignals: [],
        },
      });
      await prisma.merchantListingSignal.create({
        data: {
          merchantListingId: worseOffer.id,
          source: "mercado_livre_catalog_items",
          raw: { price: 199.9, original_price: null, condition: "used", shipping: { free_shipping: false } },
        },
      });

      const betterOffer = await prisma.merchantListing.create({
        data: {
          merchantId,
          externalId: `TEST-OFFER-BETTER-${runId}`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: "https://produto.mercadolivre.com.br/better-item",
          canonicalProductId: canonical.id,
        },
      });
      listingIds.push(betterOffer.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: betterOffer.id,
          score: 85,
          confidence: 0.9,
          components: {},
          reasons: [],
          missingSignals: [],
        },
      });
      await prisma.merchantListingSignal.create({
        data: {
          merchantListingId: betterOffer.id,
          source: "mercado_livre_catalog_items",
          raw: {
            price: 179.9,
            original_price: 249.9,
            discountPercent: 0.28,
            condition: "new",
            shipping: { free_shipping: true },
            seller: { nickname: "LOJAOFICIAL", levelId: "5_green", powerSellerStatus: "gold" },
            permalinkVerified: false,
          },
        },
      });

      const queue = await getMlAffiliateQueue(50);
      const item = queue.find((i) => i.merchantListingId === catalogListing.id);
      expect(item).toBeDefined();
      // The queue item's identity (merchantListingId) stays the catalog
      // row — only its DISPLAYED data is upgraded to the best offer.
      expect(item!.merchantListingId).toBe(catalogListing.id);
      expect(item!.publicUrl).toBe("https://produto.mercadolivre.com.br/better-item");
      expect(item!.monetizationScore).toBe(85);
      expect(item!.bestOffer).toEqual({
        price: 179.9,
        originalPrice: 249.9,
        discountPercent: 0.28,
        condition: "new",
        freeShipping: true,
        sellerNickname: "LOJAOFICIAL",
        sellerReputationLevel: "5_green",
        sellerPowerSellerStatus: "gold",
        permalinkVerified: false,
      });

      // The worse offer is a real MerchantListing in its own right, but
      // was never the recommended one and must never leak into the
      // catalog row's displayed identity.
      expect(item!.publicUrl).not.toBe("https://produto.mercadolivre.com.br/worse-item");
    });

    it("URGENT FIX (2026-09-07): never claims a permalink is verified, even for a stale signal predating this field — an exhaustive real-API investigation found no endpoint that confirms a public permalink for a third-party Mercado Livre item (GET /items/{id}, multiget, unauthenticated, site search, buy_box_winner, pickers[].permalink — all blocked or empty)", async () => {
      const canonical = await prisma.canonicalProduct.create({
        data: {
          slug: `test-canonical-legacy-${runId}`,
          title: "Produto Legado Teste",
          specifications: { catalogProductId: `TEST-CATALOG-LEGACY-${runId}` },
        },
      });
      const catalogListing = await prisma.merchantListing.create({
        data: {
          merchantId,
          externalId: `TEST-CATALOG-LEGACY-${runId}`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: "https://produto.mercadolivre.com.br/catalog-page",
          canonicalProductId: canonical.id,
        },
      });
      listingIds.push(catalogListing.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: catalogListing.id,
          score: 70,
          confidence: 0.6,
          components: {},
          reasons: [],
          missingSignals: [],
        },
      });

      const legacyOffer = await prisma.merchantListing.create({
        data: {
          merchantId,
          externalId: `TEST-OFFER-LEGACY-${runId}`,
          externalIdType: "MERCHANT_PRODUCT_ID",
          productUrl: "https://produto.mercadolivre.com.br/legacy-item",
          canonicalProductId: canonical.id,
        },
      });
      listingIds.push(legacyOffer.id);
      await prisma.monetizationScore.create({
        data: {
          merchantListingId: legacyOffer.id,
          score: 80,
          confidence: 0.7,
          components: {},
          reasons: [],
          missingSignals: [],
        },
      });
      // Simulates a row persisted by the pre-fix version of
      // scripts/ml-enrich-offers.ts — no permalinkVerified field at all.
      await prisma.merchantListingSignal.create({
        data: {
          merchantListingId: legacyOffer.id,
          source: "mercado_livre_catalog_items",
          raw: { price: 99.9, original_price: null, condition: "new", shipping: { free_shipping: false } },
        },
      });

      const queue = await getMlAffiliateQueue(50);
      const item = queue.find((i) => i.merchantListingId === catalogListing.id);
      expect(item?.bestOffer?.permalinkVerified).toBe(false);
    });

    it("falls back to demand-only display (bestOffer: null) for a catalog listing with no enriched real offers yet — never a fabricated offer", async () => {
      const listing = await makeListing({ score: 60, hasActiveLink: false });
      const queue = await getMlAffiliateQueue(50);
      const item = queue.find((i) => i.merchantListingId === listing.id);
      expect(item?.bestOffer).toBeNull();
    });
  });
});

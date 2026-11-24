import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPublicRadarFeed, getAdminRadarFeed } from "@/lib/queries/radar-events";
import { getUnifiedMerchantOffers } from "@/lib/queries/unified-offers";
import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";

/**
 * Performance hotfix (2026-09-12) regression guard. The incident: Home
 * went from ~4s to 32.6s in production because getUnifiedMerchantOffers/
 * getPublicRadarFeed ran an unbounded `findMany` (no `take`) and then, for
 * every Mercado Livre catalog candidate, one MORE query
 * (`merchantListing.findFirst`) to find its best real offer sibling — a
 * textbook N+1 that scales with catalog size, not request size.
 *
 * The most direct, least implementation-coupled way to prove that loop is
 * actually gone (not just "seems fast on my machine") is to assert the
 * exact Prisma call the old code made per candidate — `findFirst` — is
 * never called at all by these functions anymore, regardless of how many
 * eligible candidates exist. Wall-clock timing alone can't catch a
 * regression on a fast local Postgres with a small dataset; call-count
 * can, at any scale. scripts/performance-acquisition-check.ts covers the
 * complementary "stays fast at real volume" benchmark.
 */

const RUN_ID = `n1-guard-${Date.now()}`;
const CANDIDATE_COUNT = 15;

let mlMerchantId: string;
let shopeeMerchantId: string;
const canonicalIds: string[] = [];
const listingIds: string[] = [];

beforeAll(async () => {
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;

  for (let i = 0; i < CANDIDATE_COUNT; i++) {
    // --- Mercado Livre: catalog listing + a real offer sibling (the
    // exact shape that used to trigger one findFirst PER iteration) ---
    const canonical = await prisma.canonicalProduct.create({
      data: { slug: `${RUN_ID}-ml-${i}`, title: `Produto Guard ML ${i}` },
    });
    canonicalIds.push(canonical.id);
    const catalogListing = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `${RUN_ID}-ML-CATALOG-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://mercadolivre.com.br/${RUN_ID}/${i}`,
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(catalogListing.id);
    await prisma.merchantListingSignal.create({
      data: { merchantListingId: catalogListing.id, source: "mercado_livre_highlights", raw: {}, bestsellerRank: 1 },
    });
    const offerListing = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `${RUN_ID}-ML-OFFER-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://mercadolivre.com.br/${RUN_ID}/offer/${i}`,
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(offerListing.id);
    await prisma.merchantListingSignal.createMany({
      data: [
        { merchantListingId: offerListing.id, source: "mercado_livre_catalog_items", raw: { price: 200 }, observedAt: new Date(Date.now() - 60 * 60 * 1000) },
        { merchantListingId: offerListing.id, source: "mercado_livre_catalog_items", raw: { price: 150 }, observedAt: new Date() },
      ],
    });
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: offerListing.id,
        score: 80,
        confidence: 0.8,
        components: { offerQuality: { value: 80, quality: "OBSERVED", detail: "test" } },
        reasons: [],
        missingSignals: [],
      },
    });
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: catalogListing.id,
        merchantId: mlMerchantId,
        publicUrl: catalogListing.productUrl,
        affiliateUrl: `https://mercadolivre.com/afiliado/${RUN_ID}/${i}`,
        attributionTag: "precocaindo",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });

    // --- Shopee: flat listing ---
    const shopeeListing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `${RUN_ID}-SHOPEE-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://shopee.com.br/${RUN_ID}/${i}`,
      },
    });
    listingIds.push(shopeeListing.id);
    await prisma.merchantListingSignal.createMany({
      data: [
        { merchantListingId: shopeeListing.id, source: "shopee_product_offer_v2", raw: { productName: `Produto Guard Shopee ${i}`, priceMin: "100.00" }, observedAt: new Date(Date.now() - 60 * 60 * 1000) },
        { merchantListingId: shopeeListing.id, source: "shopee_product_offer_v2", raw: { productName: `Produto Guard Shopee ${i}`, priceMin: "80.00" }, observedAt: new Date() },
      ],
    });
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: shopeeListing.id,
        score: 80,
        confidence: 0.8,
        components: { offerQuality: { value: 80, quality: "OBSERVED", detail: "test" } },
        reasons: [],
        missingSignals: [],
      },
    });
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: shopeeListing.id,
        merchantId: shopeeMerchantId,
        publicUrl: shopeeListing.productUrl,
        affiliateUrl: `https://s.shopee.com.br/${RUN_ID}/${i}`,
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });
  }
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

/**
 * Manually patches+restores a Prisma model method to count real
 * invocations while the wrapped call runs. `vi.spyOn`/`vi.restoreAllMocks`
 * don't reliably round-trip through Prisma's Proxy-based client (a
 * restored spy came back as `undefined` in practice, breaking every test
 * after it) — plain property reassignment inside try/finally is more
 * primitive but doesn't depend on that machinery at all.
 */
async function countCalls(
  method: "findFirst" | "findMany",
  fn: () => Promise<unknown>,
): Promise<number> {
  // Deliberately untyped (`any`) — this is a narrow, test-only monkey
  // patch, not production code fighting Prisma's overloaded generic
  // signatures buys nothing here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma.merchantListing as any;
  const original = model[method].bind(prisma.merchantListing);
  let calls = 0;
  model[method] = (...args: unknown[]) => {
    calls += 1;
    return original(...args);
  };
  try {
    await fn();
  } finally {
    model[method] = original;
  }
  return calls;
}

describe("no N+1 regression — findFirst is never called per candidate", () => {
  it("getUnifiedMerchantOffers never calls merchantListing.findFirst, regardless of candidate count", async () => {
    const counts = await countCalls("findFirst", () => getUnifiedMerchantOffers(24));
    expect(counts).toBe(0);
  });

  it("getPublicRadarFeed never calls merchantListing.findFirst, regardless of candidate count", async () => {
    const counts = await countCalls("findFirst", () => getPublicRadarFeed(20));
    expect(counts).toBe(0);
  });

  it("getAdminRadarFeed never calls merchantListing.findFirst, regardless of candidate count", async () => {
    const counts = await countCalls("findFirst", () => getAdminRadarFeed(50));
    expect(counts).toBe(0);
  });

  it("listIndexableMerchantProductUrls (sitemap) never calls merchantListing.findFirst, regardless of candidate count", async () => {
    const counts = await countCalls("findFirst", () => listIndexableMerchantProductUrls());
    expect(counts).toBe(0);
  });

  it("getUnifiedMerchantOffers issues a small, fixed number of findMany calls — not one per candidate", async () => {
    const counts = await countCalls("findMany", () => getUnifiedMerchantOffers(24));
    // 3 today (Shopee hydration, ML catalog hydration, batched best-offer
    // lookup) — pool MEMBERSHIP itself is a `$queryRaw`, not `findMany`
    // (candidate-pool.ts, commission-bias fix, 2026-09-12), so it doesn't
    // show up in this count at all. Asserting well under CANDIDATE_COUNT
    // (15) proves this doesn't grow with the number of eligible listings.
    expect(counts).toBeLessThanOrEqual(5);
  });

  it("getPublicRadarFeed issues a small, fixed number of findMany calls — not one per candidate", async () => {
    const counts = await countCalls("findMany", () => getPublicRadarFeed(20));
    expect(counts).toBeLessThanOrEqual(5);
  });
});

describe("limits are still respected with real candidates present", () => {
  it("getPublicRadarFeed never returns more than the requested limit", async () => {
    const feed = await getPublicRadarFeed(5);
    expect(feed.length).toBeLessThanOrEqual(5);
  });

  it("getUnifiedMerchantOffers never returns more than the requested limit", async () => {
    const offers = await getUnifiedMerchantOffers(5);
    expect(offers.length).toBeLessThanOrEqual(5);
  });

  it("getUnifiedMerchantOffers never pads below the limit when fewer real candidates exist", async () => {
    // CANDIDATE_COUNT real Shopee + real ML candidates exist; asking for
    // far more than that must return only what's real, never fabricated.
    const offers = await getUnifiedMerchantOffers(10_000);
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.length).toBeLessThan(10_000);
  });
});

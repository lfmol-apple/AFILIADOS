import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";
import { getUnifiedMerchantOffers } from "@/lib/queries/unified-offers";
import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";
import { selectBestOfferIdsPerCanonicalProduct } from "@/lib/queries/candidate-pool";

/**
 * Production incident regression guard (2026-09-13). The performance
 * hotfix and its commission-bias follow-up were both verified against
 * synthetic data with exactly ONE real offer per Mercado Livre canonical
 * product — a shape that never exists in production. Real data has
 * canonical products with 100-174 real offer siblings each (average
 * ~27). Fetching every sibling to find the "best" one (what
 * bestByNonCommissionSignal alone did) pulled thousands of rows per
 * request and hung the Home page / 504'd the sitemap the moment this
 * shipped against real data.
 *
 * This suite seeds ONE canonical product with SKEWED_OFFER_COUNT (300 —
 * comfortably above the worst real case of 174) real offer siblings and
 * proves: (1) the correct one still wins (by demand+offerQuality, not
 * DB-arrival order), and (2) resolving it stays fast regardless of how
 * many siblings exist — the direct, load-bearing claim the previous
 * synthetic benchmarks never tested.
 */

const RUN_ID = `skew-guard-${Date.now()}`;
const SKEWED_OFFER_COUNT = 300;
let mlMerchantId: string;
let canonicalId: string;
let catalogListingId: string;
let bestOfferId: string;
const listingIds: string[] = [];

beforeAll(async () => {
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;

  const canonical = await prisma.canonicalProduct.create({
    data: { slug: `${RUN_ID}-canonical`, title: `Produto Skew Guard ${RUN_ID}`, publicSlug: `${RUN_ID}-public` },
  });
  canonicalId = canonical.id;

  const catalogListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `${RUN_ID}-catalog`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://mercadolivre.com.br/${RUN_ID}/catalog`,
      canonicalProductId: canonicalId,
      active: true,
    },
  });
  catalogListingId = catalogListing.id;
  listingIds.push(catalogListingId);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: catalogListingId, source: "mercado_livre_highlights", raw: {}, bestsellerRank: 1 },
  });
  await prisma.monetizationScore.create({
    data: {
      merchantListingId: catalogListingId,
      score: 50,
      confidence: 0.8,
      components: { demand: { value: 50, quality: "OBSERVED", detail: "test" } },
      reasons: [],
      missingSignals: [],
    },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: catalogListingId,
      merchantId: mlMerchantId,
      publicUrl: catalogListing.productUrl,
      affiliateUrl: `https://mercadolivre.com/afiliado/${RUN_ID}`,
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
    },
  });

  // SKEWED_OFFER_COUNT real offer siblings — the shape production
  // actually has (up to 174 observed for a single canonical product).
  // Exactly one (index 0) is the genuine best: highest demand+offerQuality.
  for (let i = 0; i < SKEWED_OFFER_COUNT; i++) {
    const isBest = i === 0;
    const offer = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `${RUN_ID}-offer-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://mercadolivre.com.br/${RUN_ID}/offer/${i}`,
        canonicalProductId: canonicalId,
        active: true,
      },
    });
    listingIds.push(offer.id);
    if (isBest) bestOfferId = offer.id;
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: offer.id,
        score: isBest ? 1 : 1_000_000, // a high-commission-style score never wins
        confidence: 0.8,
        components: {
          demand: { value: isBest ? 1_000_000 : 1, quality: "OBSERVED", detail: "test" },
          offerQuality: { value: isBest ? 1_000_000 : 1, quality: "OBSERVED", detail: "test" },
        },
        reasons: [],
        missingSignals: [],
      },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: offer.id,
        source: "mercado_livre_catalog_items",
        raw: { price: isBest ? 50 : 999 },
      },
    });
  }
}, 60_000);

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: canonicalId } });
}, 60_000);

/**
 * Wraps merchantListing.findMany to record the largest single result
 * array size seen during `fn`. Wall-clock timing alone can't catch this
 * regression locally — 300 rows on a fast, uncontended local Postgres
 * resolves in milliseconds either way, which is exactly why this bug
 * shipped past two rounds of review. Counting rows-per-call is
 * scale-invariant: fetching every sibling returns ~300 in one call
 * regardless of how fast that call is; fetching only the DISTINCT-ON
 * winner(s) never returns more than a handful. Manual monkey-patch, not
 * `vi.spyOn` — see tests/acquisition-query-bounds.test.ts's countCalls
 * for why (Prisma's Proxy-based client doesn't round-trip through
 * `vi.restoreAllMocks` reliably).
 */
async function maxFindManyResultSize(fn: () => Promise<unknown>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma.merchantListing as any;
  const original = model.findMany.bind(prisma.merchantListing);
  let max = 0;
  model.findMany = async (...args: unknown[]) => {
    const result = await original(...args);
    if (Array.isArray(result)) max = Math.max(max, result.length);
    return result;
  };
  try {
    await fn();
  } finally {
    model.findMany = original;
  }
  return max;
}

describe("resolving the best offer stays bounded and correct with 300 real siblings", () => {
  it("selectBestOfferIdsPerCanonicalProduct returns exactly one id — the genuine best, not the highest-scored one", async () => {
    const ids = await selectBestOfferIdsPerCanonicalProduct([canonicalId], [catalogListingId]);
    expect(ids).toEqual([bestOfferId]);
  });

  it("getUnifiedMerchantOffers never fetches more than a handful of rows in one findMany call, and resolves the genuine best offer", async () => {
    let offers: Awaited<ReturnType<typeof getUnifiedMerchantOffers>> = [];
    const maxRows = await maxFindManyResultSize(async () => {
      offers = await getUnifiedMerchantOffers(24);
    });
    const card = offers.find((o) => o.id === catalogListingId);
    expect(card).toBeDefined();
    expect(card?.currentPrice).toBe(50); // the genuine best offer's price, never one of the 299 fillers'
    expect(card?.opportunitySignal).toBe(1_000_000);
    // Well under 300 — proves no findMany call fetched every sibling.
    expect(maxRows).toBeLessThan(200); // CANDIDATE_POOL_CEILING is 200 - the bug fetched 300+ in one call
  });

  it("getPublicRadarFeed never fetches more than a handful of rows in one findMany call", async () => {
    const maxRows = await maxFindManyResultSize(() => getPublicRadarFeed(20));
    expect(maxRows).toBeLessThan(200); // CANDIDATE_POOL_CEILING is 200 - the bug fetched 300+ in one call
  });

  it("listIndexableMerchantProductUrls (sitemap) never fetches more than a handful of rows in one findMany call", async () => {
    const maxRows = await maxFindManyResultSize(() => listIndexableMerchantProductUrls());
    expect(maxRows).toBeLessThan(200); // CANDIDATE_POOL_CEILING is 200 - the bug fetched 300+ in one call
  });
});

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getUnifiedMerchantOffers, selectTopUnifiedOffers, type UnifiedOfferCard } from "@/lib/queries/unified-offers";

/**
 * Acquisition Engine V1 — Home/`/ofertas` must tag their clicks
 * differently (source=home vs source=ofertas) so AffiliateClick can
 * distinguish which surface actually drove the click, reusing the exact
 * same getUnifiedMerchantOffers(limit, linkParams) mechanism
 * searchUnifiedOffers already uses for source=search — no second
 * tracking system, no schema change.
 */

let shopeeMerchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

beforeAll(async () => {
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;

  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `TRACKING-SOURCE-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://shopee.com.br/x",
    },
  });
  listingIds.push(listing.id);
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Produto Tracking Source ${runId}`, priceMin: "25.00" },
    },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: listing.id,
      merchantId: shopeeMerchantId,
      publicUrl: listing.productUrl,
      affiliateUrl: "https://s.shopee.com.br/tracking-source-test",
      attributionTag: "precocaindo",
      source: "API",
      status: "ACTIVE",
    },
  });
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("getUnifiedMerchantOffers — per-surface tracking source", () => {
  it("tags Home's call with source=home", async () => {
    const cards = await getUnifiedMerchantOffers(50, { source: "home" });
    const item = cards.find((c) => c.title === `Produto Tracking Source ${runId}`);
    expect(item?.href).toContain("source=home");
  });

  it("tags /ofertas's default (no-search) call with source=ofertas", async () => {
    const cards = await getUnifiedMerchantOffers(50, { source: "ofertas" });
    const item = cards.find((c) => c.title === `Produto Tracking Source ${runId}`);
    expect(item?.href).toContain("source=ofertas");
  });

  it("falls back to source=unified_offers when no linkParams are given (no caller regression)", async () => {
    const cards = await getUnifiedMerchantOffers(50);
    const item = cards.find((c) => c.title === `Produto Tracking Source ${runId}`);
    expect(item?.href).toContain("source=unified_offers");
  });
});

describe("selectTopUnifiedOffers", () => {
  function card(id: string, opportunitySignal: number | null): UnifiedOfferCard {
    return {
      id,
      merchant: "SHOPEE",
      title: id,
      imageUrl: null,
      currentPrice: 10,
      referencePrice: null,
      discountPercent: null,
      rating: null,
      soldQuantity: null,
      opportunitySignal,
      href: `/go/shopee/${id}`,
    };
  }

  it("never pads with fabricated entries — fewer than the limit of real cards stays fewer", () => {
    const result = selectTopUnifiedOffers([card("a", 10), card("b", 20), card("c", 5)], 8);
    expect(result).toHaveLength(3);
  });

  it("ranks by opportunitySignal, highest first, and caps at the limit", () => {
    const result = selectTopUnifiedOffers(
      [card("a", 10), card("b", 90), card("c", 5), card("d", 50)],
      2,
    );
    expect(result.map((r) => r.id)).toEqual(["b", "d"]);
  });
});

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPublicRadarFeed, getAdminRadarFeed } from "@/lib/queries/radar-events";

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
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("radar-events — Shopee", () => {
  it("detects a real PRICE_DROP from two accumulated signals and gates the CTA on AffiliateLinkRegistry.status", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `RADAR-TEST-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/x",
      },
    });
    listingIds.push(listing.id);
    await prisma.monetizationScore.create({
      data: { merchantListingId: listing.id, score: 70, confidence: 0.7, components: {}, reasons: [], missingSignals: [] },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Teste Radar", priceMin: "200.00" },
        observedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Teste Radar", priceMin: "140.00" },
        observedAt: new Date(),
      },
    });

    // No AffiliateLinkRegistry row yet — CTA must be null (fail-closed).
    let feed = await getPublicRadarFeed(50);
    let item = feed.find((i) => i.event.merchantListingId === listing.id && i.event.type === "PRICE_DROP");
    expect(item).toBeDefined();
    expect(item!.event.evidence.dropPercent).toBeCloseTo(0.3);
    expect(item!.ctaHref).toBeNull();

    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId: shopeeMerchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://s.shopee.com.br/radar-test",
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });

    feed = await getPublicRadarFeed(50);
    item = feed.find((i) => i.event.merchantListingId === listing.id && i.event.type === "PRICE_DROP");
    expect(item!.ctaHref).toBe(`/go/shopee/${encodeURIComponent(listing.externalId)}?pageType=radar&pageSlug=radar&source=radar_feed`);
  });

  it("AFFILIATE_LINK_ACTIVATED is excluded from the public feed but present in the admin feed", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `RADAR-LINK-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/y",
      },
    });
    listingIds.push(listing.id);
    await prisma.monetizationScore.create({
      data: { merchantListingId: listing.id, score: 60, confidence: 0.6, components: {}, reasons: [], missingSignals: [] },
    });
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId: shopeeMerchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://s.shopee.com.br/radar-link-test",
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });

    const publicFeed = await getPublicRadarFeed(50);
    expect(
      publicFeed.some((i) => i.event.merchantListingId === listing.id && i.event.type === "AFFILIATE_LINK_ACTIVATED"),
    ).toBe(false);

    const adminFeed = await getAdminRadarFeed(200);
    expect(
      adminFeed.some((i) => i.event.merchantListingId === listing.id && i.event.type === "AFFILIATE_LINK_ACTIVATED"),
    ).toBe(true);
  });

  it("a listing with no MonetizationScore never enters the radar — absence of evidence is not evidence of an event", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `RADAR-NOSCORE-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/z",
      },
    });
    listingIds.push(listing.id);
    // No signals, no MonetizationScore.
    const feed = await getAdminRadarFeed(500);
    expect(feed.some((i) => i.event.merchantListingId === listing.id)).toBe(false);
  });
});

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getEngagementSignals,
  ENGAGEMENT_BOOST_WINDOW_DAYS,
} from "@/lib/queries/engagement-boost";
import { OWNER_CLICK_MEDIUM } from "@/lib/admin/owner-traffic";

const runId = Date.now();
let merchantId: string;
let listingId: string;
let productId: string;
let categoryId: string;

/** Same formula as recencyWeightSql in lib/queries/engagement-boost.ts —
 * kept in sync manually so this test asserts the real, intended weight, not
 * just "whatever the SQL happens to compute". */
function expectedWeight(daysAgo: number): number {
  const oldestDayWeight = 0.4;
  const clamped = Math.min(
    ENGAGEMENT_BOOST_WINDOW_DAYS - 1,
    Math.max(0, daysAgo),
  );
  return (
    1 - (clamped / (ENGAGEMENT_BOOST_WINDOW_DAYS - 1)) * (1 - oldestDayWeight)
  );
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  merchantId = merchant.id;

  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-ENGAGEMENT-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/x",
      slug: `produto-engajamento-teste-${runId}`,
    },
  });
  listingId = listing.id;

  const category = await prisma.category.upsert({
    where: { slug: `__test-engagement-category-${runId}__` },
    create: {
      name: "Test Engagement",
      slug: `__test-engagement-category-${runId}__`,
    },
    update: {},
  });
  categoryId = category.id;
  const product = await prisma.product.create({
    data: {
      asin: `TESTENG${runId}`,
      slug: `produto-amazon-engajamento-${runId}`,
      title: "Test Amazon Engagement Product",
      categoryId,
      active: true,
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.affiliateClick.deleteMany({
    where: { OR: [{ merchantListingId: listingId }, { productId }] },
  });
  await prisma.pageView.deleteMany({
    where: {
      pageSlug: {
        in: [
          `produto-engajamento-teste-${runId}`,
          `produto-amazon-engajamento-${runId}`,
        ],
      },
    },
  });
  await prisma.merchantListing.delete({ where: { id: listingId } });
  await prisma.product.delete({ where: { id: productId } });
  await prisma.category.delete({ where: { id: categoryId } });
});

describe("getEngagementSignals", () => {
  it("weights each click/view by recency, drops anything outside the window, and never counts the owner's own", async () => {
    await prisma.affiliateClick.createMany({
      data: [
        // 2 real clicks today (weight 1.0 each) on the Shopee listing
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: daysAgo(0),
        },
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: daysAgo(0),
        },
        // the owner's own click, same day — must never count
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          medium: OWNER_CLICK_MEDIUM,
          createdAt: daysAgo(0),
        },
        // a click from before the window even opened — must never count
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: daysAgo(ENGAGEMENT_BOOST_WINDOW_DAYS + 1),
        },
        // the Amazon product's only click, 3 days ago — partial weight
        {
          productId,
          provider: "AMAZON",
          pageType: "product",
          pageSlug: `produto-amazon-engajamento-${runId}`,
          createdAt: daysAgo(3),
        },
      ],
    });
    await prisma.pageView.createMany({
      data: [
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s1-${runId}`,
          createdAt: daysAgo(0),
        },
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s2-${runId}`,
          createdAt: daysAgo(0),
        },
        // right at the far edge of the window — counts, but at reduced weight
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s3-${runId}`,
          createdAt: daysAgo(ENGAGEMENT_BOOST_WINDOW_DAYS - 1),
        },
        // outside the window — must never count
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s4-${runId}`,
          createdAt: daysAgo(ENGAGEMENT_BOOST_WINDOW_DAYS + 3),
        },
        // a non-product pageview with the same slug string — must never count
        {
          pageType: "ofertas",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s5-${runId}`,
          createdAt: daysAgo(0),
        },
      ],
    });

    const signals = await getEngagementSignals();

    const expectedClicks = expectedWeight(0) * 2; // the out-of-window and owner clicks excluded
    expect(signals.clicksByCardId.get(listingId)).toBeCloseTo(
      expectedClicks,
      1,
    );
    expect(signals.clicksByCardId.get(productId)).toBeCloseTo(
      expectedWeight(3),
      1,
    );

    const expectedViews =
      expectedWeight(0) * 2 + expectedWeight(ENGAGEMENT_BOOST_WINDOW_DAYS - 1);
    expect(
      signals.viewsBySlug.get(`produto-engajamento-teste-${runId}`),
    ).toBeCloseTo(expectedViews, 1);
  });
});

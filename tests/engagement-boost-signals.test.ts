import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getEngagementSignals } from "@/lib/queries/engagement-boost";
import { OWNER_CLICK_MEDIUM } from "@/lib/admin/owner-traffic";

const runId = Date.now();
let merchantId: string;
let listingId: string;
let productId: string;
let categoryId: string;

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
  it("counts real clicks by card id (merchantListingId for Shopee/ML, productId for Amazon) and real product pageviews by slug — never the owner's", async () => {
    await prisma.affiliateClick.createMany({
      data: [
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
        },
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
        },
        {
          merchantId,
          merchantListingId: listingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          medium: OWNER_CLICK_MEDIUM,
        },
        {
          productId,
          provider: "AMAZON",
          pageType: "product",
          pageSlug: `produto-amazon-engajamento-${runId}`,
        },
      ],
    });
    await prisma.pageView.createMany({
      data: [
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s1-${runId}`,
        },
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s2-${runId}`,
        },
        {
          pageType: "product",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s3-${runId}`,
        },
        // a non-product pageview with the same slug string must never count
        {
          pageType: "ofertas",
          pageSlug: `produto-engajamento-teste-${runId}`,
          sessionId: `s4-${runId}`,
        },
      ],
    });

    const signals = await getEngagementSignals(30);

    expect(signals.clicksByCardId.get(listingId)).toBe(2); // owner's click excluded
    expect(signals.clicksByCardId.get(productId)).toBe(1);
    expect(signals.viewsBySlug.get(`produto-engajamento-teste-${runId}`)).toBe(
      3,
    );
  });
});

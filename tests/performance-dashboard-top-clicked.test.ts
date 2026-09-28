import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getTopClickedProductsMulti } from "@/lib/queries/performance-dashboard";
import { OWNER_CLICK_MEDIUM } from "@/lib/admin/owner-traffic";

const runId = Date.now();
let mlMerchantId: string;
let shopeeMerchantId: string;
let canonicalId: string;
let mlListingId: string;
let shopeeListingId: string;

beforeAll(async () => {
  const mlMerchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = mlMerchant.id;
  const shopeeMerchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopeeMerchant.id;

  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `test-top-clicked-canonical-${runId}`,
      publicSlug: `escova-secadora-teste-${runId}`,
      title: "Escova Secadora Teste",
    },
  });
  canonicalId = canonical.id;

  const mlListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      canonicalProductId: canonicalId,
      externalId: `TEST-TOPCLICK-ML-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://produto.mercadolivre.com.br/x",
    },
  });
  mlListingId = mlListing.id;

  const shopeeListing = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `TEST-TOPCLICK-SHOPEE-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/x",
      slug: `kit-potes-teste-${runId}`,
    },
  });
  shopeeListingId = shopeeListing.id;
});

afterAll(async () => {
  await prisma.affiliateClick.deleteMany({
    where: { merchantListingId: { in: [mlListingId, shopeeListingId] } },
  });
  await prisma.merchantListing.deleteMany({
    where: { id: { in: [mlListingId, shopeeListingId] } },
  });
  await prisma.canonicalProduct.delete({ where: { id: canonicalId } });
});

describe("getTopClickedProductsMulti", () => {
  it("counts real clicks per product across 7d/30d/all-time, links to the public page when there is one, and excludes owner clicks", async () => {
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 3600 * 1000);
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 3600 * 1000);

    await prisma.affiliateClick.createMany({
      data: [
        // ML listing: 2 clicks this week, 1 eight days ago, 1 forty days ago
        {
          merchantId: mlMerchantId,
          merchantListingId: mlListingId,
          canonicalProductId: canonicalId,
          provider: "MERCADO_LIVRE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: now,
        },
        {
          merchantId: mlMerchantId,
          merchantListingId: mlListingId,
          canonicalProductId: canonicalId,
          provider: "MERCADO_LIVRE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: now,
        },
        {
          merchantId: mlMerchantId,
          merchantListingId: mlListingId,
          canonicalProductId: canonicalId,
          provider: "MERCADO_LIVRE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: eightDaysAgo,
        },
        {
          merchantId: mlMerchantId,
          merchantListingId: mlListingId,
          canonicalProductId: canonicalId,
          provider: "MERCADO_LIVRE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: fortyDaysAgo,
        },
        // owner's own click on the same listing — must not count anywhere
        {
          merchantId: mlMerchantId,
          merchantListingId: mlListingId,
          canonicalProductId: canonicalId,
          provider: "MERCADO_LIVRE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          medium: OWNER_CLICK_MEDIUM,
          createdAt: now,
        },
        // Shopee listing: 1 click today, has its own slug (no CanonicalProduct)
        {
          merchantId: shopeeMerchantId,
          merchantListingId: shopeeListingId,
          provider: "SHOPEE",
          pageType: "ofertas",
          pageSlug: "ofertas",
          createdAt: now,
        },
      ],
    });

    const rows = await getTopClickedProductsMulti(50);
    const ml = rows.find((r) => r.title === "Escova Secadora Teste");
    const shopee = rows.find(
      (r) =>
        r.merchant === "SHOPEE" &&
        r.clicksAllTime > 0 &&
        r.href?.includes(`kit-potes-teste-${runId}`),
    );

    expect(ml).toBeDefined();
    expect(ml!.clicks7d).toBe(2);
    expect(ml!.clicks30d).toBe(3);
    expect(ml!.clicksAllTime).toBe(4); // the owner's click never counts
    expect(ml!.href).toBe(`/produto/escova-secadora-teste-${runId}`);

    expect(shopee).toBeDefined();
    expect(shopee!.clicks7d).toBe(1);
    expect(shopee!.clicksAllTime).toBe(1);
  });
});

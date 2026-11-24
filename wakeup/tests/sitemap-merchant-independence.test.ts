import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { ensureCanonicalProductPublicSlug, ensureShopeeListingSlug } from "@/lib/queries/public-product";
import { STATIC_ROUTE_PATHS } from "@/app/sitemap";
import { GUIDES } from "@/lib/editorial/guides";
import { siteConfig } from "@/lib/config/site";

/**
 * Pre-production audit fix: app/sitemap.ts used to compute
 * listIndexableMerchantProductUrls() (Mercado Livre/Shopee) INSIDE the
 * same early return gated by currentlyVisibleDataSources() — a function
 * scoped entirely to Product.dataSource (Amazon/MOCK/MANUAL_VERIFIED; see
 * lib/config/public-catalog.ts). A closed Amazon catalog gate silently
 * deleted every legitimate ML/Shopee page from the sitemap too, even
 * though evaluatePublicationGate()/AffiliateLinkRegistry is a completely
 * independent authority for those pages.
 *
 * This file drives the REAL sitemap() default export end-to-end (not just
 * listIndexableMerchantProductUrls() in isolation — see
 * tests/sitemap-multimerchant.test.ts for that) with the Amazon catalog
 * gate forced closed, proving Mercado Livre/Shopee entries survive while
 * Amazon stays hidden and the Publication Gate remains the sole authority
 * for merchant pages.
 */

const runId = Date.now();
let shopeeMerchantId: string;
let mlMerchantId: string;
let categoryId: string;
const listingIds: string[] = [];
const canonicalIds: string[] = [];
const productIds: string[] = [];

let shopeeIndexableSlug: string;
let shopeeNotIndexableSlug: string;
let mlIndexablePublicSlug: string;
let mlNotIndexableSlug: string;
const amazonMockSlug = `__test-sitemap-independence-amazon-${runId}__`;

beforeAll(async () => {
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;

  const category = await prisma.category.upsert({
    where: { slug: `__test-sitemap-independence-cat-${runId}__` },
    create: { name: "Test Sitemap Independence", slug: `__test-sitemap-independence-cat-${runId}__` },
    update: {},
  });
  categoryId = category.id;

  // --- Amazon: a real, gated Product (MOCK) — must vanish when the
  // Amazon catalog gate is closed, exactly like before this fix. ---
  const amazonProduct = await prisma.product.upsert({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: `SMI${runId}`.slice(0, 10) } },
    create: {
      asin: `SMI${runId}`.slice(0, 10),
      provider: "AMAZON",
      marketplace: "BR",
      slug: amazonMockSlug,
      title: "Test Sitemap Independence Amazon Product",
      categoryId,
      active: true,
      dataSource: "MOCK",
    },
    update: { dataSource: "MOCK", active: true },
  });
  productIds.push(amazonProduct.id);

  // --- Shopee: indexable (real history + ACTIVE link) ---
  const shopeeGood = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SMI-SHOPEE-GOOD-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://shopee.com.br/good",
    },
  });
  listingIds.push(shopeeGood.id);
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: shopeeGood.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Produto Sitemap Indep Shopee ${runId}`, priceMin: "50.00" },
      observedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  });
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: shopeeGood.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Produto Sitemap Indep Shopee ${runId}`, priceMin: "40.00" },
      observedAt: new Date(),
    },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: shopeeGood.id,
      merchantId: shopeeMerchantId,
      publicUrl: shopeeGood.productUrl,
      affiliateUrl: "https://s.shopee.com.br/sitemap-independence-good",
      attributionTag: "precocaindo",
      source: "API",
      status: "ACTIVE",
    },
  });
  shopeeIndexableSlug = await ensureShopeeListingSlug(shopeeGood.id, `Produto Sitemap Indep Shopee ${runId}`);

  // --- Shopee: fails the gate — no AffiliateLinkRegistry row at all,
  // even though it has a real title/price. Slug generated anyway (a
  // listing can have a slug and still not be indexable). ---
  const shopeeBad = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SMI-SHOPEE-BAD-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://shopee.com.br/bad",
    },
  });
  listingIds.push(shopeeBad.id);
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: shopeeBad.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Produto Sitemap Indep Shopee Reprovado ${runId}`, priceMin: "10.00" },
    },
  });
  shopeeNotIndexableSlug = await ensureShopeeListingSlug(
    shopeeBad.id,
    `Produto Sitemap Indep Shopee Reprovado ${runId}`,
  );

  // --- Mercado Livre: indexable (catalog + best offer + ACTIVE link) ---
  const canonicalGood = await prisma.canonicalProduct.create({
    data: { slug: `ml-catalog-smi-good-${runId}`, title: `Produto Sitemap Indep ML ${runId}` },
  });
  canonicalIds.push(canonicalGood.id);
  const mlCatalogGood = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `SMI-ML-GOOD-CATALOG-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://mercadolivre.com.br/good-catalog",
      canonicalProductId: canonicalGood.id,
    },
  });
  listingIds.push(mlCatalogGood.id);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: mlCatalogGood.id, source: "mercado_livre_highlights", raw: {}, bestsellerRank: 3 },
  });
  const mlOfferGood = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `SMI-ML-GOOD-OFFER-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://mercadolivre.com.br/good-offer",
      canonicalProductId: canonicalGood.id,
    },
  });
  listingIds.push(mlOfferGood.id);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: mlOfferGood.id, source: "mercado_livre_catalog_items", raw: { price: 899 } },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: mlCatalogGood.id,
      merchantId: mlMerchantId,
      publicUrl: mlCatalogGood.productUrl,
      affiliateUrl: "https://mercadolivre.com/afiliado/sitemap-independence-good",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
    },
  });
  mlIndexablePublicSlug = await ensureCanonicalProductPublicSlug(canonicalGood.id, canonicalGood.title);

  // --- Mercado Livre: fails the gate — real catalog row, but no
  // AffiliateLinkRegistry (fila humana ainda não gerou o link). ---
  const canonicalBad = await prisma.canonicalProduct.create({
    data: { slug: `ml-catalog-smi-bad-${runId}`, title: `Produto Sitemap Indep ML Reprovado ${runId}` },
  });
  canonicalIds.push(canonicalBad.id);
  const mlCatalogBad = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `SMI-ML-BAD-CATALOG-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://mercadolivre.com.br/bad-catalog",
      canonicalProductId: canonicalBad.id,
    },
  });
  listingIds.push(mlCatalogBad.id);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: mlCatalogBad.id, source: "mercado_livre_highlights", raw: {}, bestsellerRank: 4 },
  });
  mlNotIndexableSlug = await ensureCanonicalProductPublicSlug(canonicalBad.id, canonicalBad.title);
});

afterAll(async () => {
  await prisma.affiliateLinkRegistry.deleteMany({ where: { merchantListingId: { in: listingIds } } });
  await prisma.merchantListingSignal.deleteMany({ where: { merchantListingId: { in: listingIds } } });
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("app/sitemap.ts — merchant (ML/Shopee) pages are independent of the Amazon catalog gate", () => {
  it("A — Amazon gate closed: an indexable Shopee page still appears", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(shopeeIndexableSlug))).toBe(true);
  });

  it("B — Amazon gate closed: the Amazon product stays absent (no accidental catalog opening)", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(amazonMockSlug))).toBe(false);
  });

  it("C — Amazon gate closed: a Shopee listing that fails the Publication Gate (no ACTIVE link) stays absent", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(shopeeNotIndexableSlug))).toBe(false);
  });

  it("D — Amazon gate closed: an indexable Mercado Livre page still appears", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(mlIndexablePublicSlug))).toBe(true);
  });

  it("E — Amazon gate closed: a Mercado Livre catalog row that never got an ACTIVE link is never a phantom URL, and the static/guide surfaces are exactly the legitimate ones", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();

    expect(entries.some((e) => e.url.includes(mlNotIndexableSlug))).toBe(false);
    expect(entries.some((e) => e.url.includes(shopeeNotIndexableSlug))).toBe(false);

    // Every static route this app actually declares is present exactly
    // once, and every guide is present — nothing fabricated, nothing
    // missing, regardless of how many real merchant pages also qualify.
    for (const path of STATIC_ROUTE_PATHS) {
      const count = entries.filter((e) => e.url === `${siteConfig.url}${path}`).length;
      expect(count).toBe(1);
    }
    for (const guide of GUIDES) {
      expect(entries.some((e) => e.url.endsWith(`/guias/${guide.slug}`))).toBe(true);
    }
  });
});

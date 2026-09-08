import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { searchUnifiedOffers } from "@/lib/queries/unified-offers";

let shopeeMerchantId: string;
let mlMerchantId: string;
const listingIds: string[] = [];
const productIds: string[] = [];
const runId = Date.now();

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  // --- Shopee: one findable, ACTIVE link ---
  const shopeeListing = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SEARCH-SHOPEE-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://shopee.com.br/x",
    },
  });
  listingIds.push(shopeeListing.id);
  await prisma.monetizationScore.create({
    data: { merchantListingId: shopeeListing.id, score: 70, confidence: 0.7, components: {}, reasons: [], missingSignals: [] },
  });
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: shopeeListing.id, source: "shopee_product_offer_v2", raw: { productName: `Galaxy A17 Capinha ${runId}`, priceMin: "39.90" } },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: shopeeListing.id,
      merchantId: shopeeMerchantId,
      publicUrl: shopeeListing.productUrl,
      affiliateUrl: "https://s.shopee.com.br/search-test",
      attributionTag: "precocaindo",
      source: "API",
      status: "ACTIVE",
    },
  });

  // --- Shopee: findable by title but NO active link (fail-closed test) ---
  const shopeeNoLink = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SEARCH-SHOPEE-NOLINK-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://shopee.com.br/y",
    },
  });
  listingIds.push(shopeeNoLink.id);
  await prisma.monetizationScore.create({
    data: { merchantListingId: shopeeNoLink.id, score: 90, confidence: 0.7, components: {}, reasons: [], missingSignals: [] },
  });
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: shopeeNoLink.id, source: "shopee_product_offer_v2", raw: { productName: `Galaxy A17 Sem Link ${runId}`, priceMin: "10.00" } },
  });

  // --- Mercado Livre: one findable catalog row, ACTIVE link ---
  const canonical = await prisma.canonicalProduct.create({
    data: { slug: `search-test-canonical-${runId}`, title: `Samsung Galaxy A17 Teste ${runId}`, specifications: { catalogProductId: `SEARCH-ML-${runId}` } },
  });
  const mlListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `SEARCH-ML-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://produto.mercadolivre.com.br/x",
      canonicalProductId: canonical.id,
    },
  });
  listingIds.push(mlListing.id);
  await prisma.monetizationScore.create({
    data: { merchantListingId: mlListing.id, score: 80, confidence: 0.6, components: {}, reasons: [], missingSignals: [] },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: mlListing.id,
      merchantId: mlMerchantId,
      publicUrl: mlListing.productUrl,
      affiliateUrl: "https://meli.la/search-test",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
    },
  });

  // --- Amazon: real Product, visible (MANUAL_VERIFIED, ambient env has
  // PUBLIC_CATALOG_ENABLED=true + MANUAL_PRODUCTS_ENABLED=true) ---
  const product = await prisma.product.create({
    data: {
      asin: `SEARCHTEST${runId}`,
      marketplace: "BR",
      dataSource: "MANUAL_VERIFIED",
      slug: `galaxy-a17-search-test-${runId}`,
      title: `Samsung Galaxy A17 Amazon Teste ${runId}`,
      active: true,
    },
  });
  productIds.push(product.id);
  await prisma.offer.create({
    data: { productId: product.id, price: 999, affiliateUrl: "https://amazon.com.br/search-test" },
  });
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

describe("searchUnifiedOffers", () => {
  it("finds the real Mercado Livre listing by title", async () => {
    const { items } = await searchUnifiedOffers({ query: `Galaxy A17 Teste ${runId}` });
    expect(items.some((i) => i.merchant === "MERCADO_LIVRE" && i.title.includes(`Teste ${runId}`))).toBe(true);
  });

  it("finds the real Shopee listing by title", async () => {
    const { items } = await searchUnifiedOffers({ query: `Capinha ${runId}` });
    expect(items.some((i) => i.merchant === "SHOPEE" && i.title.includes(`Capinha ${runId}`))).toBe(true);
  });

  it("finds the real Amazon product by title (regression — search worked before, must still work)", async () => {
    const { items } = await searchUnifiedOffers({ query: `Amazon Teste ${runId}` });
    expect(items.some((i) => i.merchant === "AMAZON" && i.title.includes(`Amazon Teste ${runId}`))).toBe(true);
  });

  it("returns no results for a query that matches nothing real", async () => {
    const { items } = await searchUnifiedOffers({ query: `termo-inexistente-${runId}-xyz` });
    expect(items).toEqual([]);
  });

  it("is case-insensitive", async () => {
    const { items } = await searchUnifiedOffers({ query: `GALAXY A17 teste ${runId}`.toUpperCase() });
    expect(items.some((i) => i.merchant === "MERCADO_LIVRE")).toBe(true);
  });

  it("fail-closed: a real, findable Shopee listing without an ACTIVE AffiliateLink never appears in search results", async () => {
    const { items } = await searchUnifiedOffers({ query: `Galaxy A17 Sem Link ${runId}` });
    expect(items).toEqual([]);
  });

  it("tags every Shopee/ML result's href with source=search and the real query (campaign) — reuses AffiliateClick's existing source/campaign columns, no second tracking system", async () => {
    const { items } = await searchUnifiedOffers({ query: `Galaxy A17 Teste ${runId}` });
    const mlItem = items.find((i) => i.merchant === "MERCADO_LIVRE");
    expect(mlItem?.href).toContain("source=search");
    expect(mlItem?.href).toContain(encodeURIComponent(`Galaxy A17 Teste ${runId}`).replace(/%20/g, "+"));
  });

  it("never calls fetch (no ML/Shopee/Amazon API call during a search request — only our own already-observed database)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await searchUnifiedOffers({ query: `Galaxy A17 Teste ${runId}` });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

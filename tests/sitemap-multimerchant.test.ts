import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { listIndexableMerchantProductUrls, ensureCanonicalProductPublicSlug, ensureShopeeListingSlug } from "@/lib/queries/public-product";

/**
 * app/sitemap.ts calls listIndexableMerchantProductUrls() directly (see
 * its "Mercado Livre/Shopee product pages" block) — testing this function
 * covers exactly what the sitemap includes/excludes, without needing to
 * also mock lib/config/public-catalog.ts's env-driven
 * currentlyVisibleDataSources() gate that wraps the whole sitemap.
 */

let mlMerchantId: string;
let shopeeMerchantId: string;
const listingIds: string[] = [];
const canonicalIds: string[] = [];
const runId = Date.now();

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
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

async function createIndexableMlListing(suffix: string) {
  const canonical = await prisma.canonicalProduct.create({
    data: { slug: `ml-catalog-sitemap-${suffix}-${runId}`, title: `Produto Sitemap ML ${suffix}` },
  });
  canonicalIds.push(canonical.id);
  const catalogListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `MLB-SITEMAP-${suffix}-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://mercadolivre.com.br/x",
      canonicalProductId: canonical.id,
    },
  });
  listingIds.push(catalogListing.id);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: catalogListing.id, source: "mercado_livre_highlights", raw: {}, bestsellerRank: 2 },
  });
  const offerListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `MLB-SITEMAP-OFFER-${suffix}-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://mercadolivre.com.br/offer",
      canonicalProductId: canonical.id,
    },
  });
  listingIds.push(offerListing.id);
  await prisma.merchantListingSignal.create({
    data: { merchantListingId: offerListing.id, source: "mercado_livre_catalog_items", raw: { price: 500 } },
  });
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: catalogListing.id,
      merchantId: mlMerchantId,
      publicUrl: catalogListing.productUrl,
      affiliateUrl: "https://mercadolivre.com/afiliado/sitemap-test",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
    },
  });
  return canonical;
}

describe("listIndexableMerchantProductUrls", () => {
  it("inclui um produto ML indexável que já tem publicSlug", async () => {
    const canonical = await createIndexableMlListing("with-slug");
    const publicSlug = await ensureCanonicalProductPublicSlug(canonical.id, canonical.title);

    const urls = await listIndexableMerchantProductUrls();
    expect(urls.some((u) => u.slug === publicSlug)).toBe(true);
  });

  it("NÃO inclui um CanonicalProduct sem publicSlug, mesmo sendo indexável (backfill ainda não rodou)", async () => {
    const canonical = await createIndexableMlListing("no-slug-yet");

    const urls = await listIndexableMerchantProductUrls();
    // Nenhuma URL desse teste aparece porque publicSlug continua null —
    // listIndexableMerchantProductUrls nunca gera slug, só lista os já
    // existentes (backfill/lazy generation é responsabilidade de outro
    // caminho).
    const anyMatchesThisCanonical = urls.some((u) => u.slug.includes(canonical.id));
    expect(anyMatchesThisCanonical).toBe(false);
  });

  it("NÃO inclui um listing Shopee sem valor adicional real (não passa no gate) mesmo com slug", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `SHOPEE-SITEMAP-NOVALUE-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/x",
      },
    });
    listingIds.push(listing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Sem Valor Adicional", priceMin: "20.00" },
      },
    });
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId: shopeeMerchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://s.shopee.com.br/sitemap-test",
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });
    const slug = await ensureShopeeListingSlug(listing.id, "Produto Sem Valor Adicional");

    const urls = await listIndexableMerchantProductUrls();
    expect(urls.some((u) => u.slug === slug)).toBe(false);
  });

  it("inclui um listing Shopee indexável (histórico real de preço) que já tem slug", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `SHOPEE-SITEMAP-INDEXABLE-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/y",
      },
    });
    listingIds.push(listing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Indexável Sitemap", priceMin: "100.00" },
        observedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Indexável Sitemap", priceMin: "100.00" },
        observedAt: new Date(),
      },
    });
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId: shopeeMerchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://s.shopee.com.br/sitemap-indexable-test",
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });
    const slug = await ensureShopeeListingSlug(listing.id, "Produto Indexável Sitemap");

    const urls = await listIndexableMerchantProductUrls();
    expect(urls.some((u) => u.slug === slug)).toBe(true);
  });
});

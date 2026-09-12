import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  loadMerchantListingFactsByListingId,
  loadMerchantListingFactsBySlug,
  loadMerchantListingFactsByPublicSlug,
} from "@/lib/services/merchant-listing-facts";

let shopeeMerchantId: string;
let mlMerchantId: string;
const listingIds: string[] = [];
const canonicalIds: string[] = [];
const runId = Date.now();

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
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

describe("extractShopeeListingFacts (via loadMerchantListingFactsByListingId)", () => {
  it("extrai título/imagem/preço/histórico real de signals reais", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `FACTS-SHOPEE-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/facts-test",
      },
    });
    listingIds.push(listing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Fralda Teste", imageUrl: "https://img/x.jpg", priceMin: "100.00", rating: 4.9, sales: 50 },
        observedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Fralda Teste", imageUrl: "https://img/x.jpg", priceMin: "80.00", rating: 4.9, sales: 60 },
        observedAt: new Date(),
      },
    });

    const facts = await loadMerchantListingFactsByListingId(listing.id);
    expect(facts).not.toBeNull();
    expect(facts!.merchant).toBe("SHOPEE");
    expect(facts!.title).toBe("Fralda Teste");
    expect(facts!.imageUrl).toBe("https://img/x.jpg");
    expect(facts!.currentPrice).toBe(80);
    expect(facts!.priceHistory).toHaveLength(2);
    expect(facts!.rating).toBe(4.9);
    expect(facts!.soldQuantity).toBe(60);
    expect(facts!.affiliateLinkStatus).toBeNull();
    expect(facts!.affiliateUrl).toBeNull();
  });
});

describe("extractMercadoLivreListingFacts (via loadMerchantListingFactsByListingId / loadMerchantListingFactsByPublicSlug)", () => {
  it("extrai fatos do catálogo + melhor oferta-irmã: título/imagem vêm do CanonicalProduct, preço/condição vêm da oferta", async () => {
    const canonical = await prisma.canonicalProduct.create({
      data: {
        slug: `ml-catalog-facts-${runId}`,
        title: "Aparelho Teste ML",
        brand: "MarcaX",
        model: "ModeloY",
        imageUrl: "https://img/ml.jpg",
      },
    });
    canonicalIds.push(canonical.id);

    const catalogListing = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `MLB-CATALOG-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://mercadolivre.com.br/catalog",
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(catalogListing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: catalogListing.id,
        source: "mercado_livre_highlights",
        raw: {},
        bestsellerRank: 4,
      },
    });

    const offerListing = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `MLB-OFFER-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://mercadolivre.com.br/offer",
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(offerListing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: offerListing.id,
        source: "mercado_livre_catalog_items",
        raw: { price: 999.9, condition: "new", shipping: { free_shipping: true }, seller: { levelId: "5_green" } },
      },
    });
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: offerListing.id,
        score: 80,
        confidence: 0.8,
        components: { offerQuality: { value: 90, quality: "OBSERVED", detail: "test" } },
        reasons: [],
        missingSignals: [],
      },
    });

    const facts = await loadMerchantListingFactsByListingId(catalogListing.id);
    expect(facts).not.toBeNull();
    expect(facts!.merchant).toBe("MERCADO_LIVRE");
    expect(facts!.title).toBe("Aparelho Teste ML");
    expect(facts!.imageUrl).toBe("https://img/ml.jpg");
    expect(facts!.brand).toBe("MarcaX");
    expect(facts!.model).toBe("ModeloY");
    expect(facts!.currentPrice).toBe(999.9);
    expect(facts!.condition).toBe("new");
    expect(facts!.freeShipping).toBe(true);
    expect(facts!.sellerReputationLevel).toBe("5_green");
    expect(facts!.bestsellerRank).toBe(4);
    expect(facts!.offerQualityScore).toBe(90);

    // Passar o id da OFERTA (não do catálogo) deve retornar null — nunca uma
    // página pública própria para uma linha individual de oferta ML.
    const offerFacts = await loadMerchantListingFactsByListingId(offerListing.id);
    expect(offerFacts).toBeNull();
  });

  it("catálogo sem CanonicalProduct.publicSlug ainda resolve pelo slug técnico interno", async () => {
    const canonical = await prisma.canonicalProduct.create({
      data: { slug: `ml-catalog-noslug-${runId}`, title: "Produto Sem Slug Público" },
    });
    canonicalIds.push(canonical.id);
    const catalogListing = await prisma.merchantListing.create({
      data: {
        merchantId: mlMerchantId,
        externalId: `MLB-NOSLUG-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://mercadolivre.com.br/noslug",
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(catalogListing.id);

    const result = await loadMerchantListingFactsByPublicSlug(`ml-catalog-noslug-${runId}`);
    expect(result).not.toBeNull();
    expect(result!.hasPublicSlug).toBe(false);
    expect(result!.facts.title).toBe("Produto Sem Slug Público");
  });
});

describe("loadMerchantListingFactsBySlug (Shopee)", () => {
  it("retorna null quando o slug não existe", async () => {
    const facts = await loadMerchantListingFactsBySlug(`slug-inexistente-${runId}`);
    expect(facts).toBeNull();
  });

  it("resolve um listing Shopee pelo slug persistido", async () => {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopeeMerchantId,
        externalId: `FACTS-SLUG-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://shopee.com.br/slug-test",
        slug: `produto-slug-teste-${runId}`,
      },
    });
    listingIds.push(listing.id);
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "shopee_product_offer_v2",
        raw: { productName: "Produto Com Slug", priceMin: "10.00" },
      },
    });

    const facts = await loadMerchantListingFactsBySlug(`produto-slug-teste-${runId}`);
    expect(facts).not.toBeNull();
    expect(facts!.merchantListingId).toBe(listing.id);
  });
});

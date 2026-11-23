import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createVitrine } from "@/lib/services/vitrine-manager";
import { loadVitrinePublicProducts } from "@/lib/queries/vitrine-public";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "URL pública estável para cada vitrine").
 * Real integration test against the local dev database — proves the
 * public query is correctly scoped to ONE vitrine (never leaking
 * another's products, the same real bug fixed in the admin panel and
 * Meta catalog feed) and correctly requires an ACTIVE VitrineLink
 * before a product appears publicly.
 */
const TEST_PREFIX = "vpub-test-";

async function makeFixture() {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `${TEST_PREFIX}canonical-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      publicSlug: `${TEST_PREFIX}public-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: "Produto fixture público (vitrine-public)",
      imageUrl: "https://example.com/fixture.jpg",
    },
  });
  // Real shape confirmed earlier this session (ml-enrichment-collector.ts):
  // the "catalog" listing (what VitrineSelection points to) carries no
  // mercado_livre_catalog_items signal itself — that signal lives on a
  // SEPARATE real seller-offer listing, which is where the real price
  // actually comes from (loadMerchantListingFactsByPublicSlug's own
  // catalogListing/bestOffer split).
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}ext-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto",
    },
  });
  const offerListing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}offer-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto-oferta",
    },
  });
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: offerListing.id,
      source: "mercado_livre_catalog_items",
      raw: { price: 199.9, condition: "new", seller: { levelId: "5_green" } },
    },
  });
  return { canonical, listing };
}

describe("loadVitrinePublicProducts — real scoping and ACTIVE-link gating (local dev DB)", () => {
  afterEach(async () => {
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineLink.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListingSignal.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.vitrine.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("never returns a product with no ACTIVE VitrineLink, even if it's an ACTIVE VitrineSelection", async () => {
    const { canonical, listing } = await makeFixture();
    const vitrine = await createVitrine({ slug: `${TEST_PREFIX}a-${Date.now()}`, name: "Vitrine pública (teste)" });
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: vitrine.id,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture",
      },
    });
    // No VitrineLink created at all — same real gate the Meta catalog
    // feed already applies.
    const products = await loadVitrinePublicProducts(vitrine.id);
    expect(products).toHaveLength(0);
  });

  it("returns the real product, with the correct Vitrine-tagged href, once a real ACTIVE VitrineLink exists", async () => {
    const { canonical, listing } = await makeFixture();
    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { code: "MERCADO_LIVRE" } });
    const vitrine = await createVitrine({ slug: `${TEST_PREFIX}b-${Date.now()}`, name: "Vitrine pública (teste)" });
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: vitrine.id,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture",
        affiliateUrl: "https://produto.mercadolivre.com.br/fixture?matt_tool=vitrinedinamica",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });

    const products = await loadVitrinePublicProducts(vitrine.id);
    expect(products).toHaveLength(1);
    expect(products[0]!.href).toContain(`/go/vitrine/mercado-livre/${encodeURIComponent(listing.externalId)}`);
    expect(products[0]!.href).not.toContain("/go/mercado-livre/"); // never the site's own precocaindo link
    expect(products[0]!.currentPrice).toBe(199.9);
  });

  // Owner's authorization, 2026-11-22 (Etapa 6 — validação final, item 2:
  // "demonstre... fallback correto nas superfícies públicas"). Real
  // integration proof against the local dev DB: jobs/vitrine-creative-
  // factory.ts's own stale-price safety mechanism sets ONLY
  // `publishedAt: null` on a stale ad_overlay/catalog_clean row (see
  // tests/vitrine-creative-factory-mechanism.test.ts) — it never deletes
  // or overwrites finalImageUrl, so the original asset stays intact on
  // disk/storage, just no longer eligible to be served. This test proves
  // the OTHER half of that contract: the public page's own read
  // (`publishedAt: { not: null }`) correctly treats that row as absent
  // and falls back to the real, current marketplace photo — never the
  // stale image, and never an error.
  it("falls back to the real marketplace photo when the only VitrineCreative row is unpublished (stale price) — never serves it", async () => {
    const { canonical, listing } = await makeFixture();
    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { code: "MERCADO_LIVRE" } });
    const vitrine = await createVitrine({ slug: `${TEST_PREFIX}e-${Date.now()}`, name: "Vitrine pública (teste)" });
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: vitrine.id,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture",
        affiliateUrl: "https://produto.mercadolivre.com.br/fixture?matt_tool=vitrinedinamica",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });
    // The exact real state runVitrineCreativeFactoryJob() leaves behind
    // when a baked price goes stale: approved, but publishedAt nulled —
    // the asset itself (finalImageUrl) is left completely untouched.
    const staleFinalImageUrl = "https://precocaindo.com.br/api/vitrine/creative-asset/stale-price-image.png";
    await prisma.vitrineCreative.create({
      data: {
        merchantListingId: listing.id,
        kind: "catalog_clean",
        version: 1,
        originalPhotoUrl: "https://example.com/original.jpg",
        finalImageUrl: staleFinalImageUrl,
        promptInputs: {},
        model: "gpt-image-2",
        qualityStatus: "approved",
        publishedAt: null,
      },
    });

    const products = await loadVitrinePublicProducts(vitrine.id);
    expect(products).toHaveLength(1);
    expect(products[0]!.imageUrl).toBe("https://example.com/fixture.jpg"); // the real product photo, never the stale asset
    expect(products[0]!.imageUrl).not.toBe(staleFinalImageUrl);

    await prisma.vitrineCreative.deleteMany({ where: { merchantListingId: listing.id } });
  });

  it("never leaks another vitrine's products — the real bug this query exists to avoid", async () => {
    const { canonical, listing } = await makeFixture();
    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { code: "MERCADO_LIVRE" } });
    const vitrineA = await createVitrine({ slug: `${TEST_PREFIX}c-${Date.now()}`, name: "Vitrine A (teste)" });
    const vitrineB = await createVitrine({ slug: `${TEST_PREFIX}d-${Date.now()}`, name: "Vitrine B (teste)" });
    await prisma.vitrineSelection.create({
      data: {
        vitrineId: vitrineA.id,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });

    const vitrineBProducts = await loadVitrinePublicProducts(vitrineB.id);
    expect(vitrineBProducts).toHaveLength(0); // vitrine A's product never leaks into B's public page
  });
});

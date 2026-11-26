import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resolveVitrineRedirect } from "@/lib/services/vitrine-redirect";

/**
 * Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA VITRINE
 * PRECOCAINDO"): resolveVitrineRedirect now also echoes back the real
 * product identity (merchantListingId/title/currentPrice) so the route
 * can fire ViewContent/AddToCart on the interstitial page — proves the
 * echoed merchantListingId is the exact same id a real click already
 * gets attributed against, and that the real price (not a guess) comes
 * through, against the local dev database, same fixture shape as
 * tests/vitrine-public.test.ts (a real "catalog" listing + a sibling
 * real "offer" listing carrying the actual mercado_livre_catalog_items
 * price signal).
 */
const TEST_PREFIX = "vredir-test-";

async function makeFixture(opts: { withPrice: boolean }) {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre (fixture de teste)" },
    update: {},
  });
  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `${TEST_PREFIX}canonical-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: "Secador De Cabelos Philco (fixture vitrine-redirect)",
      imageUrl: "https://example.com/fixture.jpg",
    },
  });
  const externalId = `${TEST_PREFIX}ext-${Date.now()}`;
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto",
    },
  });
  if (opts.withPrice) {
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
        raw: { price: 498.9, condition: "new", seller: { levelId: "5_green" } },
      },
    });
  }
  await prisma.vitrineLink.create({
    data: {
      merchantListingId: listing.id,
      merchantId: merchant.id,
      publicUrl: listing.productUrl,
      affiliateUrl: "https://mercadolivre.com/sec/fixturelink",
      source: "MANUAL_ADMIN_CATEGORY",
      status: "ACTIVE",
    },
  });
  return { canonical, listing, externalId };
}

describe("resolveVitrineRedirect — real product identity for the Pixel interstitial (local dev DB)", () => {
  afterEach(async () => {
    await prisma.affiliateClick.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineLink.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListingSignal.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("echoes back the exact merchantListingId (the same value a real click is attributed against), real title, and real price", async () => {
    const { listing, externalId } = await makeFixture({ withPrice: true });
    const result = await resolveVitrineRedirect({
      merchant: "mercado-livre",
      externalId,
      searchParams: new URLSearchParams({ pageType: "catalog" }),
    });

    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.merchantListingId).toBe(listing.id);
      expect(result.title).toBe("Secador De Cabelos Philco (fixture vitrine-redirect)");
      expect(result.currentPrice).toBe(498.9);
      expect(result.destination).toContain("mercadolivre.com");
    }
  });

  it("returns currentPrice: null when genuinely unknown — never a guessed value", async () => {
    const { externalId } = await makeFixture({ withPrice: false });
    const result = await resolveVitrineRedirect({
      merchant: "mercado-livre",
      externalId,
      searchParams: new URLSearchParams({ pageType: "catalog" }),
    });

    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.currentPrice).toBeNull();
    }
  });

  it("still writes the real AffiliateClick exactly as before — the new echoed fields are additive, not a behavior change", async () => {
    const { listing, externalId } = await makeFixture({ withPrice: true });
    await resolveVitrineRedirect({
      merchant: "mercado-livre",
      externalId,
      searchParams: new URLSearchParams({ pageType: "catalog" }),
    });
    const clicks = await prisma.affiliateClick.findMany({ where: { merchantListingId: listing.id } });
    expect(clicks).toHaveLength(1);
    expect(clicks[0]!.campaign).toBe("vitrine_dinamica");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";
import { GET } from "@/app/catalogo/mercado-livre.xml/route";

/**
 * Owner's authorization, 2026-11-23 ("Corrigir o descompasso entre página
 * pública e catálogo Meta"): real integration test against the local dev
 * database proving the Meta catalog feed and the public /vitrine/[slug]
 * page (loadVitrinePublicProducts) now share exactly one commercial-
 * eligibility criterion (evaluateCommercialEligibility,
 * lib/services/publication-gate.ts) — an eligible product appears in BOTH,
 * an ineligible one is silently excluded from BOTH, never one without the
 * other.
 *
 * Real root cause this closes: the earlier claim that "a Lavadora
 * Electrolux aparece no feed Meta mas indexable:false na página pública"
 * was based on a test script that only checked VitrineSelection.status,
 * never the real route's additional VitrineLink/audit/completeness gates —
 * re-verified directly against the real route logic, the feed was (and
 * is) empty for every item lacking an ACTIVE VitrineLink. This test
 * exercises the REAL route handler, not a simplified proxy.
 */
const TEST_PREFIX = "vmeta-test-";

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
      title: "Produto fixture feed Meta (teste integração)",
      imageUrl: "https://example.com/fixture-meta.jpg",
    },
  });
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: merchant.id,
      canonicalProductId: canonical.id,
      externalId: `${TEST_PREFIX}ext-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://example.com/produto",
      active: true,
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
      raw: { price: 149.9, condition: "new", seller: { levelId: "5_green" } },
    },
  });
  return { merchant, canonical, listing };
}

async function getXmlText(): Promise<string> {
  const res = await GET();
  return res.text();
}

describe("Meta catalog feed and Vitrine pública — critério único de elegibilidade comercial (DB local real)", () => {
  afterEach(async () => {
    await prisma.vitrineSelection.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.vitrineLink.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListingSignal.deleteMany({ where: { merchantListing: { externalId: { startsWith: TEST_PREFIX } } } });
    await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: TEST_PREFIX } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
  });

  it("produto ELEGÍVEL (ACTIVE + VitrineLink ACTIVE com URL real) aparece nos dois destinos", async () => {
    const { merchant, canonical, listing } = await makeFixture();
    const vitrineId = await getLegacyVitrineId();
    await prisma.vitrineSelection.create({
      data: {
        vitrineId,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture elegível",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture-meta",
        affiliateUrl: "https://produto.mercadolivre.com.br/fixture-meta?matt_tool=vitrinedinamica",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });

    const xml = await getXmlText();
    expect(xml).toContain(`<g:id>${listing.id}</g:id>`);
  });

  it("produto INELEGÍVEL (sem VitrineLink ACTIVE) fica fora dos dois destinos — nunca só de um deles", async () => {
    const { canonical, listing } = await makeFixture();
    const vitrineId = await getLegacyVitrineId();
    await prisma.vitrineSelection.create({
      data: {
        vitrineId,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture inelegível — sem link",
      },
    });
    // Nenhum VitrineLink criado — mesmo estado real de "aguardando link".

    const xml = await getXmlText();
    expect(xml).not.toContain(`<g:id>${listing.id}</g:id>`);
  });

  it("produto INELEGÍVEL (VitrineLink ACTIVE mas sem affiliateUrl real — estado inconsistente) fica fora dos dois destinos", async () => {
    const { merchant, canonical, listing } = await makeFixture();
    const vitrineId = await getLegacyVitrineId();
    await prisma.vitrineSelection.create({
      data: {
        vitrineId,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: {},
        reason: "fixture inelegível — link sem URL",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture-meta",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
        // affiliateUrl ausente de propósito: por contrato
        // (schema.prisma, VitrineLink.affiliateUrl) só deveria ficar nulo
        // em PENDING — este é o estado inconsistente que
        // evaluateCommercialEligibility trata como não elegível, nos dois
        // destinos igualmente.
      },
    });

    const xml = await getXmlText();
    expect(xml).not.toContain(`<g:id>${listing.id}</g:id>`);
  });

  it("produto reprovado pela auditoria comercial nunca é exportado ao XML, mesmo com VitrineLink ACTIVE válido", async () => {
    const { merchant, canonical, listing } = await makeFixture();
    const vitrineId = await getLegacyVitrineId();
    await prisma.vitrineSelection.create({
      data: {
        vitrineId,
        merchantListingId: listing.id,
        canonicalProductId: canonical.id,
        status: "ACTIVE",
        groupType: "recorrente",
        score: 70,
        scoreBreakdown: { commercialAudit: { verdict: "reprovado" } },
        reason: "fixture reprovada na auditoria",
      },
    });
    await prisma.vitrineLink.create({
      data: {
        merchantListingId: listing.id,
        merchantId: merchant.id,
        publicUrl: "https://produto.mercadolivre.com.br/fixture-meta",
        affiliateUrl: "https://produto.mercadolivre.com.br/fixture-meta?matt_tool=vitrinedinamica",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });

    const xml = await getXmlText();
    expect(xml).not.toContain(`<g:id>${listing.id}</g:id>`);
  });
});

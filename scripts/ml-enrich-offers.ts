/**
 * Phase 2 — commercial enrichment for the Mercado Livre catalog products
 * already detected by scripts/ml-demand-e2e-check.ts. Answers "which real
 * seller offer of this in-demand product should we generate an affiliate
 * link for?" instead of leaving the operator to investigate manually.
 *
 * Real API calls only, confirmed live 2026-09-07 (see
 * docs/MONETIZATION_SCORE.md's capability matrix):
 *   GET /products/{id}            -> brand/model/GTIN/images
 *   GET /products/{id}/items      -> real seller offers (API-native
 *                                     association, not inferred)
 *   GET /users/{sellerId}         -> real seller reputation
 *
 * Deliberately NOT called: GET /items/{id} and GET /reviews/item/{id} —
 * both return 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES for other sellers'
 * items with this app's current DevCenter permissions. sold_quantity and
 * rating stay UNKNOWN; never guessed.
 *
 * IMPORTANT — no verified public permalink exists (investigated 2026-09-07,
 * urgent correction after a real productUrl bug — see git log for the full
 * matrix). Every candidate was tested for real and rejected:
 *   - GET /items/{id} (single, multiget, field-restricted, unauthenticated)
 *     -> 403 for every variant tried.
 *   - GET /products/{id}'s own `permalink` and every `pickers[].permalink`
 *     -> always "" (empty) across 5 different real catalog products.
 *   - `buy_box_winner` -> always null across the same 5 products.
 *   - GET /sites/{site}/search (keyword or catalog_product_id) -> 403.
 * MERCHANTLISTING.PRODUCTURL IS THEREFORE NOT A CONFIRMED NAVIGABLE LINK —
 * it's a best-effort reference built from the real item_id on Mercado
 * Livre's own produto.mercadolivre.com.br redirector domain (not a guessed
 * slug/path), kept only because the schema requires a non-null URL and an
 * item-specific reference beats a generic one. Every offer's
 * MerchantListingSignal.raw carries `permalinkVerified: false` so nothing
 * downstream (queue, admin UI, tests) is allowed to present it as a
 * confirmed link — the operator's real, working path stays the official
 * Mercado Livre affiliate portal search (unchanged since Phase 1).
 *
 * Manual, human-run — not wired into jobs/ (same category as
 * scripts/shopee-first-cycle.ts and scripts/ml-demand-e2e-check.ts).
 * Idempotent: MerchantListing/CanonicalProduct rows are upserted by a
 * deterministic key; reruns don't duplicate them (MerchantListingSignal
 * rows do accumulate over time by design, same convention as the other
 * two scripts — latest wins via observedAt desc).
 *
 * Usage: npx tsx scripts/ml-enrich-offers.ts
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import {
  MercadoLivreProvider,
  findAttribute,
  type MercadoLivreSellerReputation,
} from "@/lib/providers/mercado-livre-provider";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import { offerQualityScore, getDiscountPercent } from "@/lib/services/ml-offer-quality";
import type { MonetizationScoreInput } from "@/types/monetization";

async function main() {
  if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED || !env.MERCADO_LIVRE_ACCESS_TOKEN) {
    console.error(
      "MERCADO_LIVRE_ENABLED, MERCADO_LIVRE_API_ENABLED and MERCADO_LIVRE_ACCESS_TOKEN must all be set.",
    );
    process.exitCode = 1;
    return;
  }

  const provider = new MercadoLivreProvider();
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });

  // Catalog-level listings: the demand rows scripts/ml-demand-e2e-check.ts
  // already persisted (externalId = catalog_product_id). Real seller
  // offers get their own, separate MerchantListing rows below — never
  // overwriting these.
  const catalogListings = await prisma.merchantListing.findMany({
    where: {
      merchantId: merchant.id,
      signals: { some: { source: { in: ["mercado_livre_highlights", "mercado_livre_trends"] } } },
    },
    include: { monetizationScore: true },
  });

  console.log(`${catalogListings.length} catalog product(s) para enriquecer.`);

  const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
  let offersCreated = 0;

  for (const catalogListing of catalogListings) {
    const catalogProductId = catalogListing.externalId;
    const detail = await provider.getCatalogProductDetail(catalogProductId);
    if (!detail) {
      console.log(`  ${catalogProductId}: catalog product não encontrado (404) — pulando.`);
      continue;
    }

    const canonical = await prisma.canonicalProduct.upsert({
      where: { slug: `ml-catalog-${catalogProductId}` },
      create: {
        slug: `ml-catalog-${catalogProductId}`,
        title: detail.name,
        brand: findAttribute(detail, "BRAND") ?? null,
        model: findAttribute(detail, "MODEL") ?? null,
        gtin: findAttribute(detail, "GTIN") ?? null,
        imageUrl: detail.pictures?.[0]?.url ?? null,
        specifications: {
          catalogProductId,
          domainId: detail.domain_id ?? null,
          familyName: detail.family_name ?? null,
          line: findAttribute(detail, "LINE") ?? null,
        },
      },
      update: {
        title: detail.name,
        brand: findAttribute(detail, "BRAND") ?? null,
        model: findAttribute(detail, "MODEL") ?? null,
        gtin: findAttribute(detail, "GTIN") ?? null,
        imageUrl: detail.pictures?.[0]?.url ?? null,
      },
    });

    if (catalogListing.canonicalProductId !== canonical.id) {
      await prisma.merchantListing.update({
        where: { id: catalogListing.id },
        data: { canonicalProductId: canonical.id },
      });
    }

    const items = await provider.getCatalogProductItems(catalogProductId);
    console.log(`  ${catalogProductId} (${detail.name}): ${items.length} oferta(s) real(is).`);

    const catalogDemandScore = catalogListing.monetizationScore?.score ?? 50;

    for (const item of items) {
      if (!sellerCache.has(item.seller_id)) {
        sellerCache.set(item.seller_id, await provider.getSellerReputation(item.seller_id));
      }
      const seller = sellerCache.get(item.seller_id) ?? null;

      // Not a confirmed permalink — see the file-level doc comment above
      // for the full, real investigation. Item-specific (real item_id, ML's
      // own redirector domain), but genuinely unverified: never presented
      // as "the real link" downstream without permalinkVerified: false
      // alongside it.
      const bestEffortUrl = `https://produto.mercadolivre.com.br/${item.item_id}`;

      const offerListing = await prisma.merchantListing.upsert({
        where: {
          merchantId_marketplace_externalId: {
            merchantId: merchant.id,
            marketplace: "BR",
            externalId: item.item_id,
          },
        },
        create: {
          merchantId: merchant.id,
          externalId: item.item_id,
          externalIdType: "MERCHANT_PRODUCT_ID",
          marketplace: "BR",
          productUrl: bestEffortUrl,
          source: "MANUAL_VERIFIED",
          canonicalProductId: canonical.id,
        },
        // productUrl included here too — a rerun must correct any listing
        // persisted by an earlier, buggier version of this script (the
        // original bug this fix addresses: the upsert only ever touched
        // canonicalProductId, so a stale/wrong productUrl from a prior run
        // survived forever).
        update: { canonicalProductId: canonical.id, productUrl: bestEffortUrl },
      });
      offersCreated++;

      await prisma.merchantListingSignal.create({
        data: {
          merchantListingId: offerListing.id,
          source: "mercado_livre_catalog_items",
          raw: {
            ...item,
            discountPercent: getDiscountPercent(item),
            seller,
            permalinkVerified: false,
          } as unknown as object,
        },
      });

      const input: MonetizationScoreInput = {
        demandSignal: { value: catalogDemandScore, quality: "DERIVED_FROM_OBSERVED" },
        commissionSignal: null, // no affiliate commission API available — see docs.
        trendSignal: null,
        historicalConversionSignal: null,
        offerQualitySignal: { value: offerQualityScore(item, seller), quality: "OBSERVED" },
      };
      const score = calculateMonetizationScore(input);
      await prisma.monetizationScore.upsert({
        where: { merchantListingId: offerListing.id },
        create: {
          merchantListingId: offerListing.id,
          score: score.score,
          confidence: score.confidence,
          components: score.components as unknown as object,
          reasons: score.reasons,
          missingSignals: score.missingSignals,
        },
        update: {
          score: score.score,
          confidence: score.confidence,
          components: score.components as unknown as object,
          reasons: score.reasons,
          missingSignals: score.missingSignals,
        },
      });
    }
  }

  console.log(`\nResumo: ${catalogListings.length} produto(s) processado(s), ${offersCreated} oferta(s) real(is) enriquecida(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

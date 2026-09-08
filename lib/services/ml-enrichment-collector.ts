import { prisma } from "@/lib/db";
import {
  findAttribute,
  type MercadoLivreProvider,
  type MercadoLivreSellerReputation,
} from "@/lib/providers/mercado-livre-provider";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import { offerQualityScore, getDiscountPercent } from "@/lib/services/ml-offer-quality";
import type { MonetizationScoreInput } from "@/types/monetization";

/**
 * Shared per-catalog-product enrichment logic, extracted from
 * scripts/ml-enrich-offers.ts (Automação Operacional V1, 2026-09-08) so
 * the manual script and the automated job (jobs/ml-enrichment.ts) run the
 * exact same real-API-calls-and-persistence code. Behavior unchanged from
 * the original script — see that file's own doc comment for the full,
 * real investigation behind `permalinkVerified: false` and which
 * endpoints are/aren't called.
 */
export interface EnrichCatalogListingResult {
  offersProcessed: number;
  offersCreated: number;
  offersUpdated: number;
}

type CatalogListingLike = { id: string; externalId: string; canonicalProductId: string | null };

export async function enrichCatalogListing(
  provider: MercadoLivreProvider,
  merchantId: string,
  catalogListing: CatalogListingLike,
  catalogDemandScore: number,
  sellerCache: Map<number, MercadoLivreSellerReputation | null>,
): Promise<EnrichCatalogListingResult | null> {
  const catalogProductId = catalogListing.externalId;
  const detail = await provider.getCatalogProductDetail(catalogProductId);
  if (!detail) return null; // 404 — not an error, just nothing to enrich yet.

  // General Market Scanner V1 (2026-09-08): MANUFACTURER and
  // ALPHANUMERIC_MODELS (real ML attributes, confirmed live — 77% and
  // 80% coverage respectively across the 35 real catalog products
  // checked) were already inside `detail.attributes` every cycle but
  // never extracted. Neither is a GTIN and neither confirms a
  // cross-merchant match by itself (Shopee exposes nothing comparable) —
  // stored in `specifications` (already free-form Json, no migration)
  // purely to strengthen intra-ML identity confidence for a future phase.
  // Never used by ProductMatcher's GTIN/MANUFACTURER_ID tiers as-is —
  // that would require deciding these are safe cross-listing identifiers
  // first, which this phase does not do.
  const manufacturer = findAttribute(detail, "MANUFACTURER") ?? null;
  const alphanumericModel =
    findAttribute(detail, "ALPHANUMERIC_MODELS") ?? findAttribute(detail, "ALPHANUMERIC_MODEL") ?? null;

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
        manufacturer,
        alphanumericModel,
      },
    },
    update: {
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
        manufacturer,
        alphanumericModel,
      },
    },
  });

  if (catalogListing.canonicalProductId !== canonical.id) {
    await prisma.merchantListing.update({
      where: { id: catalogListing.id },
      data: { canonicalProductId: canonical.id },
    });
  }

  const items = await provider.getCatalogProductItems(catalogProductId);

  let offersCreated = 0;
  let offersUpdated = 0;

  for (const item of items) {
    if (!sellerCache.has(item.seller_id)) {
      sellerCache.set(item.seller_id, await provider.getSellerReputation(item.seller_id));
    }
    const seller = sellerCache.get(item.seller_id) ?? null;

    // Not a confirmed permalink — see scripts/ml-enrich-offers.ts's
    // file-level doc comment for the full investigation. Item-specific,
    // never presented as verified without permalinkVerified: false too.
    const bestEffortUrl = `https://produto.mercadolivre.com.br/${item.item_id}`;

    const existing = await prisma.merchantListing.findUnique({
      where: {
        merchantId_marketplace_externalId: {
          merchantId,
          marketplace: "BR",
          externalId: item.item_id,
        },
      },
      select: { id: true },
    });

    const offerListing = await prisma.merchantListing.upsert({
      where: {
        merchantId_marketplace_externalId: {
          merchantId,
          marketplace: "BR",
          externalId: item.item_id,
        },
      },
      create: {
        merchantId,
        externalId: item.item_id,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: bestEffortUrl,
        source: "MANUAL_VERIFIED",
        canonicalProductId: canonical.id,
      },
      update: { canonicalProductId: canonical.id, productUrl: bestEffortUrl },
    });
    if (existing) offersUpdated++;
    else offersCreated++;

    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: offerListing.id,
        source: "mercado_livre_catalog_items",
        raw: {
          ...item,
          discountPercent: getDiscountPercent(item),
          seller,
          permalinkVerified: false,
          discoverySource: "ML_ENRICHMENT",
        } as unknown as object,
      },
    });

    const input: MonetizationScoreInput = {
      demandSignal: { value: catalogDemandScore, quality: "DERIVED_FROM_OBSERVED" },
      commissionSignal: null,
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

  return { offersProcessed: items.length, offersCreated, offersUpdated };
}

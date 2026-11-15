import { prisma } from "@/lib/db";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import { saveManualAffiliateLinkFromCategoryQueue } from "@/lib/services/affiliate-link-registry";
import { resolveCatalogProductId } from "@/lib/services/ml-panel-register";
import { logger } from "@/lib/observability/logger";

export class TrendingRegisterError extends Error {}

export interface TrendingRegisterResult {
  merchantListingId: string;
  catalogProductId: string;
  title: string | null;
}

/**
 * Registers a brand-new product from scratch given just a pasted
 * affiliate link and a fallback title — used by /admin/produtos-em-alta
 * (lib/queries/ml-highlight-candidates.ts's real Mercado Livre demand
 * candidates), single-row and batch alike. Unlike registerPanelPick
 * (ml-panel-register.ts), there is no pre-existing MerchantListing row
 * here. Trimmed copy of registerPanelPick's core (resolve -> upsert ->
 * enrich -> canonical fallback -> save link), without the panel-pick-only
 * scoring/issue-tracking that doesn't apply here.
 */
export async function registerTrendingPick(input: {
  keyword: string;
  affiliateUrl: string;
}): Promise<TrendingRegisterResult> {
  const catalogProductId = await resolveCatalogProductId(input.affiliateUrl);
  if (!catalogProductId) {
    throw new TrendingRegisterError(
      "Não consegui identificar o produto nesse link (não é um produto de catálogo). Gere o link de um produto de catálogo no Linkbuilder.",
    );
  }

  const merchant = await ensureMercadoLivreMerchant();
  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: catalogProductId,
      },
    },
    create: {
      merchantId: merchant.id,
      externalId: catalogProductId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: `https://www.mercadolivre.com.br/p/${catalogProductId}`,
      source: "MANUAL_VERIFIED",
    },
    update: {},
  });

  // Same safety as registerPanelPick: never silently overwrite a different
  // link already active on this product.
  const existingLink = await prisma.affiliateLinkRegistry.findFirst({
    where: { merchantListingId: listing.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existingLink) {
    throw new TrendingRegisterError(
      "Este produto já está no site com outro link. Não sobrescrevo — se o novo link paga mais, me avise para trocarmos.",
    );
  }

  try {
    const provider = await createMercadoLivreProvider();
    await enrichCatalogListing(provider, merchant.id, listing, 60, new Map());
  } catch (error) {
    logger.warn("ml_trending_register.enrich_failed", {
      catalogProductId,
      message: String(error),
    });
  }

  let current = await prisma.merchantListing.findUniqueOrThrow({
    where: { id: listing.id },
    include: { canonicalProduct: { select: { title: true } } },
  });
  if (!current.canonicalProductId) {
    // Mercado Livre did not return the product: fall back to the trending
    // keyword itself, so the page can still exist.
    const canonical = await prisma.canonicalProduct.upsert({
      where: { slug: `ml-catalog-${catalogProductId}` },
      create: {
        slug: `ml-catalog-${catalogProductId}`,
        title: input.keyword,
        specifications: { catalogProductId },
      },
      update: {},
    });
    current = await prisma.merchantListing.update({
      where: { id: listing.id },
      data: { canonicalProductId: canonical.id },
      include: { canonicalProduct: { select: { title: true } } },
    });
  }

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "trending_term_pick",
      raw: { keyword: input.keyword },
    },
  });

  await saveManualAffiliateLinkFromCategoryQueue({
    merchantListingId: listing.id,
    merchantId: merchant.id,
    merchantCode: "MERCADO_LIVRE",
    publicUrl: current.productUrl,
    affiliateUrl: input.affiliateUrl,
  });

  return {
    merchantListingId: listing.id,
    catalogProductId,
    title: current.canonicalProduct?.title ?? null,
  };
}

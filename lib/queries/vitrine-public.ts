import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import type { UnifiedOfferCard } from "@/lib/queries/unified-offers";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "URL pública estável para cada vitrine").
 * Real data for a public /vitrine/[slug] page — reuses
 * loadPublicMerchantProduct() (the SAME real price/rating/discount read
 * every other product page on the site already uses, never a stale or
 * duplicated value) and maps into the SAME UnifiedOfferCard shape
 * components/unified-offer-card.tsx already renders (owner's rule:
 * "reutilização dos componentes visuais existentes").
 *
 * Real root cause avoided here (owner's rule: "preservação dos links
 * originais de afiliados"): `href` points at the EXISTING
 * /go/vitrine/[merchant]/[externalId] route (lib/services/vitrine-redirect.ts,
 * reads VitrineLink's own vitrinedinamica tag) — never
 * /go/[merchant]/[externalId] (the site's own precocaindo tag), which is
 * what lib/queries/unified-offers.ts itself builds for the general
 * /ofertas grid and would have been the wrong link here.
 */
export interface VitrinePublicProduct extends UnifiedOfferCard {
  /** The real id the Meta catalog feed (app/catalogo/mercado-livre.xml/route.ts)
   * already publishes as `g:id` — exposed here so a future Pixel
   * integration (Etapa 5) can use the exact same identifier as
   * content_ids, confirmed consistent at the source, never re-derived
   * separately. */
  vitrineSelectionId: string;
}

export async function loadVitrinePublicProducts(vitrineId: string): Promise<VitrinePublicProduct[]> {
  const selections = await prisma.vitrineSelection.findMany({
    where: { vitrineId, status: "ACTIVE" },
    orderBy: { score: "desc" },
    select: {
      id: true,
      merchantListingId: true,
      merchantListing: {
        select: {
          externalId: true,
          canonicalProduct: { select: { publicSlug: true } },
          vitrineLink: { select: { status: true } },
        },
      },
    },
  });

  const products: VitrinePublicProduct[] = [];
  for (const selection of selections) {
    const slug = selection.merchantListing.canonicalProduct?.publicSlug;
    // Same real gates the Meta catalog feed already applies — never a
    // broken/partial card. Silently skipped this render (same convention
    // as the catalog feed), not an error page.
    if (selection.merchantListing.vitrineLink?.status !== "ACTIVE" || !slug) continue;
    const product = await loadPublicMerchantProduct(slug).catch(() => null);
    if (!product || !product.imageUrl || product.currentPrice === null) continue;

    products.push({
      vitrineSelectionId: selection.id,
      id: selection.merchantListingId,
      merchant: "MERCADO_LIVRE",
      title: product.title,
      imageUrl: product.imageUrl,
      currentPrice: product.currentPrice,
      referencePrice: product.referencePrice,
      discountPercent: product.discountPercent,
      rating: product.rating,
      soldQuantity: product.soldQuantity,
      opportunitySignal: null,
      href: `/go/vitrine/mercado-livre/${encodeURIComponent(selection.merchantListing.externalId)}?pageType=vitrine&pageSlug=${encodeURIComponent(slug)}`,
      detailHref: `/produto/${slug}`,
    });
  }
  return products;
}

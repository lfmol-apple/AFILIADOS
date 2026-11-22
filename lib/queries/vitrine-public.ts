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
 *
 * Owner's correction, 2026-11-22 ("ajuste importante na Etapa 3 — não
 * gere imagens genéricas... reutilize os criativos existentes"): the
 * image shown prefers a REAL, already-APPROVED VitrineCreative
 * (kind="catalog_clean" — no price/text baked in, by design) when one
 * exists for that exact product, falling back to the plain real
 * marketplace photo otherwise — the EXACT same lookup already
 * established in app/catalogo/mercado-livre.xml/route.ts, copied
 * verbatim here rather than re-derived, so the two surfaces can never
 * drift on what counts as "approved." Never generates anything new;
 * price/discount/availability/link always come from
 * loadPublicMerchantProduct()'s real-time read, never from whatever a
 * creative image happens to show.
 */
export interface VitrinePublicProduct extends UnifiedOfferCard {
  /** The real VitrineSelection.id — used ONLY as a stable `?p=` highlight
   * key (app/vitrine/[slug]/page.tsx), never as a Pixel/catalog
   * identifier. Correction, 2026-11-22 (Etapa 5): re-verified directly
   * against app/catalogo/mercado-livre.xml/route.ts — the real `g:id` it
   * publishes is `selection.merchantListingId`, NOT this field. The Meta
   * Pixel's `content_ids` (lib/analytics/meta-pixel-client.ts) must match
   * `g:id` exactly, so it's sourced from this object's own `id` field
   * (== merchantListingId, set below), never from vitrineSelectionId. */
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

    // Same lookup as app/catalogo/mercado-livre.xml/route.ts, copied
    // verbatim — never a new generation, never an unapproved render.
    const creative = await prisma.vitrineCreative.findFirst({
      where: { merchantListingId: selection.merchantListingId, kind: "catalog_clean", publishedAt: { not: null }, qualityStatus: "approved" },
      orderBy: { version: "desc" },
      select: { finalImageUrl: true },
    });

    products.push({
      vitrineSelectionId: selection.id,
      id: selection.merchantListingId,
      merchant: "MERCADO_LIVRE",
      title: product.title,
      imageUrl: creative?.finalImageUrl ?? product.imageUrl,
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

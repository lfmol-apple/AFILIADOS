import { prisma } from "@/lib/db";

/**
 * When a product page is opened from the Vitrine Inteligente's Meta catalog
 * (?src=vitrine), the "Ver no Mercado Livre" button must use the
 * vitrinedinamica link, not the site's own precocaindo one — so clicks from
 * paid traffic are attributed to the Vitrine, not mixed into organic clicks.
 * Returns null whenever there's no active vitrine link yet, in which case
 * the page keeps showing its normal (precocaindo) CTA — a Vitrine product
 * is never published to the Meta catalog before this exists anyway (see
 * app/catalogo/mercado-livre.xml/route.ts), but this stays defensive.
 */
export async function getVitrineCtaHref(input: {
  merchantListingId: string;
  externalId: string;
  slug: string;
}): Promise<string | null> {
  const link = await prisma.vitrineLink.findUnique({
    where: { merchantListingId: input.merchantListingId },
    select: { status: true },
  });
  if (link?.status !== "ACTIVE") return null;

  const params = new URLSearchParams({
    pageType: "product",
    pageSlug: input.slug,
    source: "meta_catalog",
  }).toString();
  return `/go/vitrine/mercado-livre/${encodeURIComponent(input.externalId)}?${params}`;
}

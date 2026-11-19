import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { siteConfig } from "@/lib/config/site";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Meta Commerce Manager catalog feed for the Vitrine Inteligente — fixed
 * address (project brief section 14), content regenerated on every fetch
 * from VitrineSelection{status:ACTIVE}. Per the architecture decision
 * (2026-11-19): `g:link` points at PreçoCaindo's OWN product page
 * (domain-verified), never straight at mercadolivre.com.br — Meta's catalog
 * feed spec requires the link to be hosted on the advertiser's own verified
 * domain (confirmed via Meta's official Commerce Platform catalog-fields
 * docs). The product page then redirects to the real, vitrinedinamica-
 * tagged Mercado Livre link via /go/vitrine/mercado-livre/[externalId]
 * (see lib/services/vitrine-cta.ts, app/go/vitrine/...).
 *
 * Only ever includes a product that has a real title, image, price AND an
 * ACTIVE vitrine link — never a partial/placeholder entry. If a product
 * loses any of those between selection and this fetch, it's silently
 * skipped this round rather than published broken (VITRINE_RENEW will
 * retire it on its next pass if it stays ineligible).
 */
export async function GET() {
  const selections = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE" },
    select: {
      merchantListingId: true,
      merchantListing: {
        select: {
          externalId: true,
          vitrineLink: { select: { status: true } },
          canonicalProduct: { select: { publicSlug: true, brand: true } },
        },
      },
    },
  });

  const items: string[] = [];
  for (const selection of selections) {
    const listing = selection.merchantListing;
    const slug = listing.canonicalProduct?.publicSlug;
    if (listing.vitrineLink?.status !== "ACTIVE" || !slug) continue;

    const product = await loadPublicMerchantProduct(slug).catch(() => null);
    if (!product || !product.imageUrl || product.currentPrice === null) {
      logger.warn("vitrine_catalog.skipped_incomplete", {
        merchantListingId: selection.merchantListingId,
      });
      continue;
    }

    const link = `${siteConfig.url}/produto/${slug}?src=vitrine`;
    items.push(
      `<item>` +
        `<g:id>${escapeXml(selection.merchantListingId)}</g:id>` +
        `<title>${escapeXml(product.title)}</title>` +
        `<description>${escapeXml(product.title)}</description>` +
        `<link>${escapeXml(link)}</link>` +
        `<g:image_link>${escapeXml(product.imageUrl)}</g:image_link>` +
        `<g:price>${product.currentPrice.toFixed(2)} BRL</g:price>` +
        `<g:availability>in stock</g:availability>` +
        `<g:brand>${escapeXml(product.brand ?? "Genérica")}</g:brand>` +
        `<g:condition>new</g:condition>` +
        `</item>`,
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">` +
    `<channel>` +
    `<title>PreçoCaindo — Vitrine Inteligente</title>` +
    `<link>${escapeXml(siteConfig.url)}</link>` +
    `<description>Catálogo de produtos selecionados pela Vitrine Inteligente</description>` +
    items.join("") +
    `</channel>` +
    `</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

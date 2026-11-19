import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { siteConfig } from "@/lib/config/site";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Meta Commerce Manager catalog feed for the Vitrine Inteligente — fixed
 * address (project brief section 14), content regenerated on every fetch
 * from VitrineSelection{status:ACTIVE}. `g:link` points at
 * precocaindo.com.br/go/vitrine/... (app/go/vitrine/[merchant]/
 * [externalId]/route.ts), never straight at mercadolivre.com.br: Meta's
 * catalog feed spec requires the link to be hosted on the advertiser's own
 * verified domain (confirmed via Meta's official Commerce Platform
 * catalog-fields docs). That route is a plain 302 redirect with no
 * intermediate page — the consumer reaches the real Mercado Livre product
 * with one click and zero extra navigation (owner's explicit requirement,
 * 2026-11-19), the same mechanism already used for every other merchant
 * click on this site. The product page itself (?src=vitrine override in
 * lib/services/vitrine-cta.ts) stays available for any future ad format
 * that does land on it, but the catalog feed no longer uses it.
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

    // VITRINE_CATALOG_LINK_MODE ("redirect" default): points straight at
    // the redirector — zero extra clicks, no intermediate page — but
    // whether Meta's catalog crawler accepts a redirect off its verified
    // domain is genuinely unconfirmed (see env.ts's doc comment on this
    // var). Switch to "product_page" the moment Commerce Manager's
    // Diagnostics tab flags an item for it; that mode lands on the exact
    // domain Meta crawled, at the cost of one extra click.
    const link =
      env.VITRINE_CATALOG_LINK_MODE === "product_page"
        ? `${siteConfig.url}/produto/${slug}?src=vitrine`
        : `${siteConfig.url}/go/vitrine/mercado-livre/${encodeURIComponent(listing.externalId)}?pageType=catalog&source=meta_catalog`;
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

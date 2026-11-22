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
 *
 * Creative decision (owner's follow-up, 2026-11-19, researched before
 * deciding): the OLDER branded image lib/services/vitrine-creative.tsx
 * generates was never used as g:image_link, for the same reason the NEW
 * AI-generated one below still isn't allowed to carry price/text baked
 * in for this field — Meta has its OWN native, policy-safe way to show
 * price on a catalog ad (Advantage+ "Add Dynamic Overlays", confirmed
 * via Meta's developer docs the same day) that reads g:price/g:sale_price
 * directly. What DOES change here (owner's authorization, "Fábrica
 * Inteligente de Criativos"): g:image_link now prefers the Fábrica's own
 * "catalog_clean" render (AI-composed environment, zero text/price baked
 * in — confirmed via Meta's own docs that a custom image for the
 * cover-media/catalog position is explicitly supported) over the plain
 * marketplace photo, falling back to the real photo whenever no approved
 * creative exists yet for that product. Henrique still configures the
 * Frame/Dynamic Overlay once in Ads Manager (one-time UI step, not code).
 */
export async function GET() {
  const selections = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE" },
    select: {
      merchantListingId: true,
      scoreBreakdown: true,
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

    // Owner's requirement, 2026-11-20 ("Primeiro teste real da
    // Vitrine", item 3): "confirme que produtos reprovados pela
    // auditoria não podem ser exportados para o XML, mesmo que
    // permaneçam registrados no banco." selectVitrineCandidates already
    // keeps a reprovado candidate out of ACTIVE status from the next
    // cycle on — this is defense-in-depth for the narrow window inside
    // a single cycle (and for any row a future code path might leave
    // ACTIVE without going through that gate), read directly from the
    // stored audit verdict, never re-derived here.
    const audit = (selection.scoreBreakdown as { commercialAudit?: { verdict?: string } } | null)?.commercialAudit;
    if (audit?.verdict === "reprovado") {
      logger.warn("vitrine_catalog.skipped_reprovado_auditoria", { merchantListingId: selection.merchantListingId });
      continue;
    }

    const product = await loadPublicMerchantProduct(slug).catch(() => null);
    if (!product || !product.imageUrl || product.currentPrice === null) {
      logger.warn("vitrine_catalog.skipped_incomplete", {
        merchantListingId: selection.merchantListingId,
      });
      continue;
    }

    // Owner's directive, 2026-11-21 ("confirme que somente imagens
    // efetivamente aprovadas sejam usadas"): `publishedAt: { not: null }`
    // already only gets set on an approved generation in
    // jobs/vitrine-creative-factory.ts, but that is true BY CONSTRUCTION
    // of that one file, not enforced here — adding the explicit
    // qualityStatus check is defense-in-depth, the same reasoning
    // already applied to commercialAudit.verdict a few lines above. If a
    // row somehow isn't approved, this falls back to the real original
    // marketplace photo (product.imageUrl) rather than serving nothing
    // or a stale/rejected render.
    const creative = await prisma.vitrineCreative.findFirst({
      where: { merchantListingId: selection.merchantListingId, kind: "catalog_clean", publishedAt: { not: null }, qualityStatus: "approved" },
      orderBy: { version: "desc" },
      select: { finalImageUrl: true },
    });
    const imageUrl = creative?.finalImageUrl ?? product.imageUrl;

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

    // Real, merchant-disclosed discount only (same fields as
    // MerchantListingFacts.referencePrice/discountPercent — never a
    // computed/guessed one). When present, g:price is the ORIGINAL price
    // and g:sale_price is the current one, per Meta's own field spec —
    // this is what drives its native price-overlay feature, not g:price
    // alone, which is why price/sale_price get swapped here rather than
    // always just reporting currentPrice as "the" price.
    const hasRealDiscount =
      product.discountPercent !== null &&
      product.discountPercent > 0 &&
      product.referencePrice !== null &&
      product.referencePrice > product.currentPrice;
    const priceTags = hasRealDiscount
      ? `<g:price>${product.referencePrice!.toFixed(2)} BRL</g:price>` +
        `<g:sale_price>${product.currentPrice.toFixed(2)} BRL</g:sale_price>`
      : `<g:price>${product.currentPrice.toFixed(2)} BRL</g:price>`;

    items.push(
      `<item>` +
        `<g:id>${escapeXml(selection.merchantListingId)}</g:id>` +
        `<title>${escapeXml(product.title)}</title>` +
        `<description>${escapeXml(product.title)}</description>` +
        `<link>${escapeXml(link)}</link>` +
        `<g:image_link>${escapeXml(imageUrl)}</g:image_link>` +
        priceTags +
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

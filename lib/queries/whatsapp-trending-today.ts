import { prisma } from "@/lib/db";
import { getTopClickedProductsMulti } from "@/lib/queries/performance-dashboard";

export interface WhatsAppTrendingItem {
  title: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";
  /** Our own product page, e.g. "/produto/xxx" — never a /go/ redirect:
   * the owner's brief (2026-11-15) is for the click to land on the site
   * itself, not skip straight to the merchant. */
  href: string;
}

interface ScoredRow {
  merchant: "MERCADO_LIVRE" | "SHOPEE";
  title: string;
  href: string;
}

/**
 * Owner's own objection, 2026-11-15: "o site ainda não tem cliques" — a
 * ranking built only from our own AffiliateClick history (what this file
 * did at first) would come back thin or empty most days right now, since
 * real site traffic is still small. Falls back to the same real, external
 * evidence the admin's own "Oportunidades de hoje" already ranks by
 * (lib/queries/operations-center.ts's MonetizationScore — sold quantity,
 * bestseller rank, rating and commission straight from ML/Shopee's own
 * data, never fabricated) for any slot real clicks don't fill. As the
 * site's own traffic grows, real clicks naturally take over more of the
 * list on their own — nothing here needs to change later.
 */
async function loadScoredCatalogToday(limit: number): Promise<ScoredRow[]> {
  const rows = await prisma.$queryRaw<
    { merchant: "MERCADO_LIVRE" | "SHOPEE"; title: string | null; slug: string | null }[]
  >`
    SELECT m.code AS merchant, cp.title, cp."publicSlug" AS slug
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code IN ('SHOPEE', 'MERCADO_LIVRE')
    JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    JOIN "MonetizationScore" ms ON ms."merchantListingId" = ml.id
    LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
    WHERE ml.active = true
      AND cp."publicSlug" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
    ORDER BY ms.score DESC
    LIMIT ${limit}
  `;
  return rows
    .filter((r): r is typeof r & { title: string; slug: string } => Boolean(r.title && r.slug))
    .map((r) => ({ merchant: r.merchant, title: r.title, href: `/produto/${r.slug}` }));
}

export async function loadWhatsAppTrendingToday(
  limit = 6,
): Promise<WhatsAppTrendingItem[]> {
  const clicked = await getTopClickedProductsMulti(100);
  const clickedWithPage = clicked.filter(
    (r): r is typeof r & { href: string } => r.href !== null,
  );
  const byClicks7d = [...clickedWithPage].sort(
    (a, b) => b.clicks7d - a.clicks7d || b.clicksAllTime - a.clicksAllTime,
  );

  const items: WhatsAppTrendingItem[] = [];
  const seenHrefs = new Set<string>();
  for (const r of byClicks7d) {
    if (r.clicks7d === 0) break; // only real recent interest counts here
    if (items.length >= limit) break;
    if (seenHrefs.has(r.href)) continue;
    seenHrefs.add(r.href);
    items.push({ title: r.title, merchant: r.merchant, href: r.href });
  }

  if (items.length < limit) {
    const scored = await loadScoredCatalogToday(limit * 2);
    for (const r of scored) {
      if (items.length >= limit) break;
      if (seenHrefs.has(r.href)) continue;
      seenHrefs.add(r.href);
      items.push(r);
    }
  }

  return items;
}

import { prisma } from "@/lib/db";
import { getTopClickedProductsMulti } from "@/lib/queries/performance-dashboard";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import { buildTelegramPostCandidate } from "@/lib/services/price-drop-digest";
import { ensurePublicSlugForListing } from "@/lib/queries/public-product";

export interface WhatsAppTrendingItem {
  title: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";
  /** Our own product page, e.g. "/produto/xxx" — never a /go/ redirect:
   * the owner's brief (2026-11-15) is for the click to land on the site
   * itself, not skip straight to the merchant. */
  href: string;
  /** Owner's brief, 2026-11-16: "quero que as imagens apareçam" — null
   * when the product genuinely has none (rare), never a placeholder. */
  imageUrl: string | null;
  /** Set only for the real, Radar-verified price-drop tier (see
   * loadVerifiedPriceDropsToday) — undefined everywhere else, never a
   * fabricated discount. buildWhatsAppItemCaption only ever claims a
   * discount when this is present. */
  verifiedDrop?: {
    previousPrice: number;
    currentPrice: number;
    dropPercent: number;
    isAllTimeLow: boolean;
  };
  /** Set only alongside verifiedDrop — lets the caller (jobs/whatsapp-
   * digest.ts) mark the listing as already shown after a real send, so
   * the same verified drop isn't repeated every day it's still active. */
  merchantListingId?: string;
}

interface ScoredRow {
  merchant: "MERCADO_LIVRE" | "SHOPEE";
  title: string;
  href: string;
  imageUrl: string | null;
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
 *
 * Requires a resolvable current price (same raw.priceMin/raw.price fields
 * lib/services/merchant-listing-facts.ts already reads) — owner's brief,
 * 2026-11-16: "vender e ganhar comissão". A WhatsApp click landing on
 * "ainda estamos acompanhando este produto" (no price shown yet) is a
 * wasted click toward a sale, never worth sending traffic to.
 */
async function loadScoredCatalogToday(limit: number): Promise<ScoredRow[]> {
  const rows = await prisma.$queryRaw<
    {
      merchant: "MERCADO_LIVRE" | "SHOPEE";
      title: string | null;
      slug: string | null;
      imageUrl: string | null;
    }[]
  >`
    SELECT m.code AS merchant, cp.title, cp."publicSlug" AS slug, cp."imageUrl" AS "imageUrl"
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code IN ('SHOPEE', 'MERCADO_LIVRE')
    JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    JOIN "MonetizationScore" ms ON ms."merchantListingId" = ml.id
    LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
    JOIN LATERAL (
      SELECT s.raw FROM "MerchantListingSignal" s
      WHERE s."merchantListingId" = ml.id
      ORDER BY s."observedAt" DESC
      LIMIT 1
    ) latest_signal ON true
    WHERE ml.active = true
      AND cp."publicSlug" IS NOT NULL
      AND coalesce(latest_signal.raw->>'priceMin', latest_signal.raw->>'price') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
    ORDER BY ms.score DESC
    LIMIT ${limit}
  `;
  return rows
    .filter((r): r is typeof r & { title: string; slug: string } => Boolean(r.title && r.slug))
    .map((r) => ({
      merchant: r.merchant,
      title: r.title,
      href: `/produto/${r.slug}`,
      imageUrl: r.imageUrl,
    }));
}

/** How many ACTIVE-linked candidates to check for a real price drop before
 * ranking — same pool-not-whole-catalog idea as jobs/telegram-digest.ts's
 * CANDIDATE_POOL_SIZE, just smaller since this only needs to fill a few
 * WhatsApp slots, not the Telegram channel's own 5/run. */
const PRICE_DROP_POOL_SIZE = 150;

interface PriceDropCandidateRow {
  id: string;
}

/**
 * Real, Radar-verified price drops among listings we already link — the
 * owner's brief (2026-11-17): "não utilizar apenas cliques e
 * MonetizationScore... aproveitar a inteligência já existente no Radar e
 * no Telegram". Deliberately mirrors jobs/telegram-digest.ts's own
 * pool-then-detect shape (never getPublicRadarFeed's bulk collectors,
 * which only cover ML listings sourced from the old highlights/trends
 * discovery — not the panel-sourced catalog that's actually linked
 * today) — same detectPriceDrop, same buildTelegramPostCandidate, so a
 * drop shown here is a drop the Telegram channel would also recognize as
 * real. Excludes listings already shown this way (whatsapp_price_drop_
 * shown signal, set by jobs/whatsapp-digest.ts after a real send) so the
 * same drop doesn't repeat every day it's still active.
 */
async function loadVerifiedPriceDropsToday(
  limit: number,
): Promise<WhatsAppTrendingItem[]> {
  const pool = await prisma.$queryRaw<PriceDropCandidateRow[]>`
    SELECT ml.id
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    JOIN "AffiliateLinkRegistry" alr
      ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    WHERE ml.active = true
      AND m.code IN ('MERCADO_LIVRE', 'SHOPEE')
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'whatsapp_price_drop_shown'
      )
    ORDER BY ml."updatedAt" DESC
    LIMIT ${PRICE_DROP_POOL_SIZE}
  `;

  const items: WhatsAppTrendingItem[] = [];
  for (const row of pool) {
    const facts = await loadMerchantListingFactsByListingId(row.id);
    if (!facts) continue;
    const candidate = buildTelegramPostCandidate(facts);
    if (!candidate) continue;
    const slug = await ensurePublicSlugForListing(row.id);
    if (!slug) continue;
    items.push({
      title: candidate.title,
      merchant: facts.merchant,
      href: `/produto/${slug}`,
      imageUrl: facts.imageUrl,
      verifiedDrop: {
        previousPrice: candidate.previousPrice,
        currentPrice: candidate.currentPrice,
        dropPercent: candidate.dropPercent,
        isAllTimeLow: candidate.isAllTimeLow,
      },
      merchantListingId: candidate.merchantListingId,
    });
  }

  return items
    .sort((a, b) => (b.verifiedDrop?.dropPercent ?? 0) - (a.verifiedDrop?.dropPercent ?? 0))
    .slice(0, limit);
}

/** Marks a verified price drop as already shown on WhatsApp, so
 * loadVerifiedPriceDropsToday stops offering it — called only after a
 * real, live send (jobs/whatsapp-digest.ts), never in dry-run. */
export async function markWhatsAppPriceDropShown(
  merchantListingId: string,
): Promise<void> {
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId,
      source: "whatsapp_price_drop_shown",
      raw: { shownAt: new Date().toISOString() },
    },
  });
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
  // Different merchant listings (e.g. the same physical product on ML and
  // on Shopee) can carry near-identical titles that only differ by casing —
  // confirmed live, 2026-11-15, two "Secador De Cabelos Philco psc3500..."
  // rows in the same batch. seenHrefs alone doesn't catch this since the
  // hrefs differ; normalizing the title catches the real duplicate without
  // needing a fuzzy match.
  const seenTitles = new Set<string>();
  for (const r of byClicks7d) {
    if (r.clicks7d === 0) break; // only real recent interest counts here
    if (items.length >= limit) break;
    if (seenHrefs.has(r.href)) continue;
    // getTopClickedProductsMulti's own title falls back to ml.slug (a raw
    // internal slug, never meant to be read as a product name) when the
    // listing has no linked CanonicalProduct — confirmed live, 2026-11-16:
    // 5 of 6 real-click items that day were exactly this, posted with a
    // slug-as-title and no photo. A real CanonicalProduct match always
    // carries both title and image together, so requiring imageUrl here
    // is enough to exclude the fallback case without re-deriving it.
    if (!r.imageUrl) continue;
    const normalizedTitle = r.title.toLowerCase();
    if (seenTitles.has(normalizedTitle)) continue;
    seenHrefs.add(r.href);
    seenTitles.add(normalizedTitle);
    items.push({ title: r.title, merchant: r.merchant, href: r.href, imageUrl: r.imageUrl });
  }

  if (items.length < limit) {
    const verifiedDrops = await loadVerifiedPriceDropsToday(limit * 2);
    for (const r of verifiedDrops) {
      if (items.length >= limit) break;
      if (seenHrefs.has(r.href)) continue;
      const normalizedTitle = r.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) continue;
      seenHrefs.add(r.href);
      seenTitles.add(normalizedTitle);
      items.push(r);
    }
  }

  if (items.length < limit) {
    const scored = await loadScoredCatalogToday(limit * 2);
    for (const r of scored) {
      if (items.length >= limit) break;
      if (seenHrefs.has(r.href)) continue;
      const normalizedTitle = r.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) continue;
      seenHrefs.add(r.href);
      seenTitles.add(normalizedTitle);
      items.push(r);
    }
  }

  return items;
}

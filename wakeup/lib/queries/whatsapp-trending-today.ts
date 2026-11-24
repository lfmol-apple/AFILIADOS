import { prisma } from "@/lib/db";
import { startOfDayInBrasilDaysAgo } from "@/lib/time/brasil";
import { REAL_VISITOR_CLICKS_SQL } from "@/lib/admin/owner-traffic";
import {
  loadMerchantListingFactsByListingId,
  type MerchantListingFacts,
} from "@/lib/services/merchant-listing-facts";
import { buildTelegramPostCandidate } from "@/lib/services/price-drop-digest";

/**
 * Every post must let the reader see the advantage just by looking at the
 * message (owner's brief, 2026-11-17) — which means every post needs a
 * real current price AND a real, clickable, direct-to-store affiliate
 * link. Three mutually exclusive cases, never blended:
 *  - verified_drop: a real drop against OUR OWN observed price history
 *    (detectPriceDrop/buildTelegramPostCandidate) — the one case that may
 *    honestly claim "queda comprovada pelo PreçoCaindo".
 *  - store_discount: the merchant's OWN disclosed original price/discount
 *    (MerchantListingFacts.referencePrice/discountPercent, Offer.
 *    originalPrice/discountPercentage for Amazon) — presented as the
 *    store's claim, never as something we verified.
 *  - price_only: no reliable reference for a "before" price exists —
 *    never fabricated, current price alone.
 */
export type WhatsAppPriceInfo =
  | {
      kind: "verified_drop";
      currentPrice: number;
      previousPrice: number;
      dropPercent: number;
      isAllTimeLow: boolean;
    }
  | {
      kind: "store_discount";
      currentPrice: number;
      originalPrice: number;
      discountPercent: number;
    }
  | { kind: "price_only"; currentPrice: number };

export interface WhatsAppTrendingItem {
  title: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";
  /** Owner's brief, 2026-11-16: "quero que as imagens apareçam" — real
   * photo required; an item with no photo is excluded, never sent with a
   * placeholder. */
  imageUrl: string;
  /** The REAL merchant affiliate link (not a PreçoCaindo /go/ redirect or
   * product page) — owner's brief, 2026-11-17: "o usuário deve clicar no
   * meu link de afiliado e chegar diretamente ao produto na loja", no
   * mandatory stop on our own site. Commission attribution still lives in
   * this URL's own tracking (sub_id/tag), set once when the link was
   * generated — we just stop wrapping it in our own redirect for this
   * channel specifically. */
  affiliateUrl: string;
  price: WhatsAppPriceInfo;
  /** ML/Shopee only — lets the caller (jobs/whatsapp-digest.ts) mark a
   * verified drop as already shown after a real send. Never set for
   * store_discount/price_only items (nothing to mark). */
  merchantListingId?: string;
}

function buildPriceInfo(
  facts: Pick<MerchantListingFacts, "currentPrice" | "referencePrice" | "discountPercent">,
  verifiedDrop?: { previousPrice: number; dropPercent: number; isAllTimeLow: boolean },
): WhatsAppPriceInfo | null {
  if (facts.currentPrice === null || facts.currentPrice <= 0) return null;
  const currentPrice = facts.currentPrice;

  if (verifiedDrop) {
    return {
      kind: "verified_drop",
      currentPrice,
      previousPrice: verifiedDrop.previousPrice,
      dropPercent: verifiedDrop.dropPercent,
      isAllTimeLow: verifiedDrop.isAllTimeLow,
    };
  }

  // Store's own disclosed discount — real, disclosed ratio required (0-1,
  // exclusive); a literal referencePrice is used when the merchant gives
  // one, otherwise it's derived from the disclosed rate alone (simple
  // algebra on a real number the store already published, never a guess).
  const discountPercent = facts.discountPercent;
  if (typeof discountPercent === "number" && discountPercent > 0 && discountPercent < 1) {
    const originalPrice =
      facts.referencePrice && facts.referencePrice > currentPrice
        ? facts.referencePrice
        : Math.round((currentPrice / (1 - discountPercent)) * 100) / 100;
    if (originalPrice > currentPrice) {
      return { kind: "store_discount", currentPrice, originalPrice, discountPercent };
    }
  }
  if (facts.referencePrice && facts.referencePrice > currentPrice) {
    return {
      kind: "store_discount",
      currentPrice,
      originalPrice: facts.referencePrice,
      discountPercent: (facts.referencePrice - currentPrice) / facts.referencePrice,
    };
  }

  return { kind: "price_only", currentPrice };
}

/** ML/Shopee: real current price + ACTIVE affiliate link + real photo, or
 * excluded entirely — never a post with a dead/missing piece. */
export function buildItemFromMerchantFacts(
  facts: MerchantListingFacts,
  verifiedDrop?: { previousPrice: number; dropPercent: number; isAllTimeLow: boolean },
): WhatsAppTrendingItem | null {
  if (facts.affiliateLinkStatus !== "ACTIVE" || !facts.affiliateUrl) return null;
  if (!facts.imageUrl) return null;
  const price = buildPriceInfo(facts, verifiedDrop);
  if (!price) return null;
  return {
    title: facts.title,
    merchant: facts.merchant,
    imageUrl: facts.imageUrl,
    affiliateUrl: facts.affiliateUrl,
    price,
    merchantListingId: price.kind === "verified_drop" ? facts.merchantListingId : undefined,
  };
}

interface AmazonTrendingFacts {
  title: string;
  imageUrl: string | null;
  affiliateUrl: string | null;
  currentPrice: number | null;
  referencePrice: number | null;
  discountPercent: number | null;
}

/** Same shape of facts as merchant-listing-facts.ts, for the one merchant
 * that module deliberately excludes (Amazon lives on Product/Offer, not
 * MerchantListing) — real latest Offer only, same `offers[0]` ordering
 * already used by lib/services/go-amazon-handler.ts. */
async function loadAmazonTrendingFacts(productId: string): Promise<AmazonTrendingFacts | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { offers: { orderBy: { observedAt: "desc" }, take: 1 } },
  });
  if (!product || !product.active) return null;
  const offer = product.offers[0];
  if (!offer) return null;
  const currentPrice = Number(offer.price);
  const originalPrice = offer.originalPrice ? Number(offer.originalPrice) : null;
  return {
    title: product.title,
    imageUrl: product.imageUrl,
    affiliateUrl: offer.affiliateUrl,
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
    referencePrice: originalPrice && originalPrice > currentPrice ? originalPrice : null,
    discountPercent: offer.discountPercentage ?? null,
  };
}

function buildItemFromAmazonFacts(facts: AmazonTrendingFacts): WhatsAppTrendingItem | null {
  if (!facts.affiliateUrl || !facts.imageUrl) return null;
  const price = buildPriceInfo(facts);
  if (!price) return null;
  return {
    title: facts.title,
    merchant: "AMAZON",
    imageUrl: facts.imageUrl,
    affiliateUrl: facts.affiliateUrl,
    price,
  };
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
 * pool-then-detect shape. Excludes listings already shown this way
 * (whatsapp_price_drop_shown signal, set by jobs/whatsapp-digest.ts after
 * a real send) so the same drop doesn't repeat every day it's still
 * active.
 */
async function loadVerifiedPriceDropsToday(limit: number): Promise<WhatsAppTrendingItem[]> {
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

  const items: Array<WhatsAppTrendingItem & { dropPercentForSort: number }> = [];
  for (const row of pool) {
    const facts = await loadMerchantListingFactsByListingId(row.id);
    if (!facts) continue;
    const candidate = buildTelegramPostCandidate(facts);
    if (!candidate) continue;
    const item = buildItemFromMerchantFacts(facts, {
      previousPrice: candidate.previousPrice,
      dropPercent: candidate.dropPercent,
      isAllTimeLow: candidate.isAllTimeLow,
    });
    if (!item) continue;
    items.push({ ...item, dropPercentForSort: candidate.dropPercent });
  }

  return items
    .sort((a, b) => b.dropPercentForSort - a.dropPercentForSort)
    .slice(0, limit)
    .map(({ dropPercentForSort: _dropPercentForSort, ...item }) => item);
}

/**
 * Owner's own objection, 2026-11-15: "o site ainda não tem cliques" — a
 * ranking built only from our own AffiliateClick history would come back
 * thin or empty most days right now, since real site traffic is still
 * small. Falls back to the same real, external evidence the admin's own
 * "Oportunidades de hoje" already ranks by (MonetizationScore — sold
 * quantity, bestseller rank, rating and commission straight from ML/
 * Shopee's own data, never fabricated) for any slot real clicks don't
 * fill.
 */
async function loadScoredCatalogToday(limit: number): Promise<WhatsAppTrendingItem[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT ml.id
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code IN ('SHOPEE', 'MERCADO_LIVRE')
    JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    JOIN "MonetizationScore" ms ON ms."merchantListingId" = ml.id
    JOIN LATERAL (
      SELECT s.raw FROM "MerchantListingSignal" s
      WHERE s."merchantListingId" = ml.id
      ORDER BY s."observedAt" DESC
      LIMIT 1
    ) latest_signal ON true
    WHERE ml.active = true
      AND coalesce(latest_signal.raw->>'priceMin', latest_signal.raw->>'price') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
    ORDER BY ms.score DESC
    LIMIT ${limit}
  `;

  const items: WhatsAppTrendingItem[] = [];
  for (const row of rows) {
    const facts = await loadMerchantListingFactsByListingId(row.id);
    if (!facts) continue;
    const item = buildItemFromMerchantFacts(facts);
    if (item) items.push(item);
  }
  return items;
}

interface ClickedEntityRow {
  merchant: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";
  entity_id: string;
  clicks_7d: bigint;
}

/**
 * Real clicks only (lib/admin/owner-traffic.ts's REAL_VISITOR_CLICKS_SQL —
 * excludes admin/owner traffic), grouped by the actual listing/product so
 * each row can be hydrated into real price/affiliate-link facts — unlike
 * lib/queries/performance-dashboard.ts's getTopClickedProductsMulti (which
 * groups by title for the admin dashboard and intentionally has no id to
 * hydrate from). A separate, local query rather than reusing that one, to
 * never risk the admin dashboard's own aggregation.
 */
async function loadClickedCandidates(limit: number): Promise<ClickedEntityRow[]> {
  const since7d = startOfDayInBrasilDaysAgo(7);
  return prisma.$queryRaw<ClickedEntityRow[]>`
    SELECT coalesce(m.code::text, 'AMAZON') AS merchant,
           coalesce(ac."merchantListingId", ac."productId") AS entity_id,
           count(*) AS clicks_7d
    FROM "AffiliateClick" ac
    LEFT JOIN "Merchant" m ON m.id = ac."merchantId"
    WHERE ac."createdAt" >= ${since7d}
      AND ${REAL_VISITOR_CLICKS_SQL}
      AND coalesce(ac."merchantListingId", ac."productId") IS NOT NULL
    GROUP BY 1, 2
    ORDER BY clicks_7d DESC
    LIMIT ${limit}
  `;
}

async function loadClickedToday(limit: number): Promise<WhatsAppTrendingItem[]> {
  const rows = await loadClickedCandidates(limit * 3);
  const items: WhatsAppTrendingItem[] = [];
  for (const row of rows) {
    if (items.length >= limit) break;
    if (row.merchant === "AMAZON") {
      const facts = await loadAmazonTrendingFacts(row.entity_id);
      const item = facts ? buildItemFromAmazonFacts(facts) : null;
      if (item) items.push(item);
      continue;
    }
    const facts = await loadMerchantListingFactsByListingId(row.entity_id);
    const item = facts ? buildItemFromMerchantFacts(facts) : null;
    if (item) items.push(item);
  }
  return items;
}

/** Marks a verified price drop as already shown on WhatsApp, so
 * loadVerifiedPriceDropsToday stops offering it — called only after a
 * real, live send (jobs/whatsapp-digest.ts), never in dry-run. */
export async function markWhatsAppPriceDropShown(merchantListingId: string): Promise<void> {
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId,
      source: "whatsapp_price_drop_shown",
      raw: { shownAt: new Date().toISOString() },
    },
  });
}

export async function loadWhatsAppTrendingToday(limit = 6): Promise<WhatsAppTrendingItem[]> {
  const items: WhatsAppTrendingItem[] = [];
  // Different merchant listings (e.g. the same physical product on ML and
  // on Shopee) can carry near-identical titles that only differ by casing —
  // confirmed live, 2026-11-15. Normalizing the title catches the real
  // duplicate without needing a fuzzy match.
  const seenTitles = new Set<string>();

  function addAll(candidates: WhatsAppTrendingItem[]) {
    for (const item of candidates) {
      if (items.length >= limit) break;
      const normalizedTitle = item.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) continue;
      seenTitles.add(normalizedTitle);
      items.push(item);
    }
  }

  addAll(await loadClickedToday(limit));
  if (items.length < limit) addAll(await loadVerifiedPriceDropsToday(limit * 2));
  if (items.length < limit) addAll(await loadScoredCatalogToday(limit * 2));

  return items;
}

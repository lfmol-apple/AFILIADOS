import { getOfertas } from "@/lib/queries/products";
import { stripNoindexDetailLinks } from "@/lib/seo/indexable-product-links";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  selectTopUnifiedOffers,
  type UnifiedOfferCard,
} from "@/lib/queries/unified-offers";
import {
  OFFER_CATEGORIES,
  isOfferCategorySlug,
  offerCategoryLabel,
} from "@/lib/offers/categories";
import {
  storeToMerchant,
  type OfferSort,
  type OfferStore,
} from "@/lib/offers/view";

/**
 * Paginated, category-filterable feed behind /ofertas (infinite scroll).
 *
 * The ranked pool is built ONCE per TTL window and sliced in memory, so
 * scrolling never re-runs the heavy merchant queries: getUnifiedMerchantOffers
 * is already bounded on purpose (candidate pool ceiling — see its doc
 * comment, 2026-09-12 performance incident), and asking it again per page
 * would multiply that cost. Consequence: the feed is exactly as deep as that
 * bounded pool (top offers per merchant), not the whole catalog.
 */
export const FEED_PAGE_SIZE = 24;
/** getUnifiedMerchantOffers caps its DB candidate pool at 200 rows PER
 * merchant no matter what limit it is given (see candidatePoolSize), then
 * slices the merged list to `limit`. 400 therefore returns every one of
 * those bounded candidates (up to 200 Mercado Livre + all Shopee) without
 * adding any database work over asking for 200. */
const POOL_LIMIT = 400;
const AMAZON_POOL_SIZE = 96;
const POOL_TTL_MS = 5 * 60 * 1000;

let cached: { at: number; cards: UnifiedOfferCard[] } | null = null;
let inflight: Promise<UnifiedOfferCard[]> | null = null;

async function buildPool(): Promise<UnifiedOfferCard[]> {
  const catalogSafe = currentlyVisibleDataSources().length > 0;
  const [amazonResult, merchantOffers] = await Promise.all([
    catalogSafe
      ? getOfertas({ page: 1, pageSize: AMAZON_POOL_SIZE })
      : { items: [] },
    getUnifiedMerchantOffers(POOL_LIMIT, { source: "ofertas" }),
  ]);
  const all = [
    ...amazonResult.items.map(mapAmazonProductToUnifiedCard),
    ...merchantOffers,
  ];
  return selectTopUnifiedOffers(all, all.length);
}

function refreshPool(): Promise<UnifiedOfferCard[]> {
  inflight ??= buildPool()
    .then((cards) => {
      cached = { at: Date.now(), cards };
      return cards;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Stale-while-revalidate: once a pool exists it is ALWAYS returned at once,
 * and a stale one is refreshed in the background. Only the very first call
 * after a start waits for the build (~1.5 s) — no visitor ever pays that
 * cost again every 5 minutes.
 */
export async function getOffersPool(
  now: number = Date.now(),
): Promise<UnifiedOfferCard[]> {
  if (cached) {
    if (now - cached.at >= POOL_TTL_MS) {
      refreshPool().catch((error) => {
        console.error("offers_feed.refresh_failed", error);
      });
    }
    return cached.cards;
  }
  return refreshPool();
}

export interface OffersPage {
  items: UnifiedOfferCard[];
  page: number;
  total: number;
  hasMore: boolean;
}

/** Stable sort; offers missing the sort key go last instead of first. */
export function sortOffers(
  cards: UnifiedOfferCard[],
  sort: OfferSort,
): UnifiedOfferCard[] {
  if (sort === "relevancia") return cards;
  const key = (c: UnifiedOfferCard): number | null =>
    sort === "desconto"
      ? c.discountPercent !== null && c.discountPercent > 0
        ? -c.discountPercent
        : null
      : c.currentPrice;
  return cards
    .map((card, index) => ({ card, index, k: key(card) }))
    .sort((a, b) => {
      if (a.k === null && b.k === null) return a.index - b.index;
      if (a.k === null) return 1;
      if (b.k === null) return -1;
      return a.k - b.k || a.index - b.index;
    })
    .map((x) => x.card);
}

/** Pure filtering, sorting and paging over an already ranked list. */
export function paginateOffers(
  cards: UnifiedOfferCard[],
  options: {
    category?: string | null;
    sort?: OfferSort;
    store?: OfferStore | null;
    page?: number;
    pageSize?: number;
  },
): OffersPage {
  const pageSize = options.pageSize ?? FEED_PAGE_SIZE;
  const category =
    options.category && isOfferCategorySlug(options.category)
      ? options.category
      : null;
  const merchant = storeToMerchant(options.store ?? null);
  const filtered = sortOffers(
    cards.filter(
      (c) =>
        (!category || c.categorySlug === category) &&
        (!merchant || c.merchant === merchant),
    ),
    options.sort ?? "relevancia",
  );
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return {
    items,
    page,
    total: filtered.length,
    hasMore: start + items.length < filtered.length,
  };
}

export async function listOffers(options: {
  category?: string | null;
  sort?: OfferSort;
  store?: OfferStore | null;
  page?: number;
}): Promise<OffersPage> {
  const page = paginateOffers(await getOffersPool(), options);
  // Applied per read (cheap, only this page's items), not baked into the
  // cached pool: the indexable-slug list is computed separately in the
  // background — see lib/seo/indexable-product-links.ts.
  return { ...page, items: stripNoindexDetailLinks(page.items) };
}

export interface CategoryCount {
  slug: string;
  label: string;
  count: number;
}

/** Only categories that actually have offers, biggest first, "Outros" last. */
export function countByCategory(cards: UnifiedOfferCard[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const slug = c.categorySlug ?? "outros";
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return OFFER_CATEGORIES.filter((c) => (counts.get(c.slug) ?? 0) > 0)
    .map((c) => ({
      slug: c.slug,
      label: offerCategoryLabel(c.slug),
      count: counts.get(c.slug) ?? 0,
    }))
    .sort((a, b) => {
      if (a.slug === "outros") return 1;
      if (b.slug === "outros") return -1;
      return b.count - a.count;
    });
}

/** Counts reflect the store filter, so the numbers match what a click shows. */
export async function getOfferCategoryCounts(
  store: OfferStore | null = null,
): Promise<CategoryCount[]> {
  const merchant = storeToMerchant(store);
  const pool = await getOffersPool();
  return countByCategory(
    merchant ? pool.filter((c) => c.merchant === merchant) : pool,
  );
}

import { getOfertas } from "@/lib/queries/products";
import { stripNoindexDetailLinks } from "@/lib/seo/indexable-product-links";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  selectTopUnifiedOffers,
  type SearchUnifiedOffersResult,
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
const POOL_LIMIT = 4000;
/** Per-merchant DB candidate ceiling for the cached pool: high enough to
 * reach EVERY active affiliate link (977 Mercado Livre + 174 Shopee today),
 * so no link the owner registers stays invisible. Safe only because this is
 * built once per few minutes, in the background — see getOffersPool. */
const FEED_POOL_CEILING = 2000;
/** Plan B if the deep build fails (DB pressure): the previous bounded pool. */
const FALLBACK_POOL_LIMIT = 400;
const AMAZON_POOL_SIZE = 96;
const POOL_TTL_MS = 5 * 60 * 1000;

/** Process-wide singleton on globalThis, not module-level variables: Next
 * can load this module once per route bundle (page, /api/ofertas, search),
 * and each copy would build its own 1,000+ offer pool — several ~8 s DB
 * builds on a 3-connection pool. One shared state means one build. */
const g = globalThis as unknown as {
  __offersFeedState?: {
    cached: { at: number; cards: UnifiedOfferCard[] } | null;
    inflight: Promise<UnifiedOfferCard[]> | null;
  };
};
const state = (g.__offersFeedState ??= { cached: null, inflight: null });

async function buildPool(): Promise<UnifiedOfferCard[]> {
  const catalogSafe = currentlyVisibleDataSources().length > 0;
  const [amazonResult, merchantOffers] = await Promise.all([
    catalogSafe
      ? getOfertas({ page: 1, pageSize: AMAZON_POOL_SIZE })
      : { items: [] },
    getUnifiedMerchantOffers(
      POOL_LIMIT,
      { source: "ofertas" },
      { poolCeiling: FEED_POOL_CEILING },
    ).catch((error) => {
      console.error("offers_feed.deep_pool_failed_using_fallback", error);
      return getUnifiedMerchantOffers(FALLBACK_POOL_LIMIT, {
        source: "ofertas",
      });
    }),
  ]);
  const all = [
    ...amazonResult.items.map(mapAmazonProductToUnifiedCard),
    ...merchantOffers,
  ];
  return selectTopUnifiedOffers(all, all.length);
}

function refreshPool(): Promise<UnifiedOfferCard[]> {
  state.inflight ??= buildPool()
    .then((cards) => {
      state.cached = { at: Date.now(), cards };
      return cards;
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
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
  if (state.cached) {
    if (now - state.cached.at >= POOL_TTL_MS) {
      refreshPool().catch((error) => {
        console.error("offers_feed.refresh_failed", error);
      });
    }
    return state.cached.cards;
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

// ---------------------------------------------------------------- search

const SEARCH_PAGE_SIZE = 24;
const AMAZON_SEARCH_LIMIT = 96;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Every word of the query must appear in the title, in any order, ignoring
 * accents and case ("creatina growth" finds "Creatina Monohidratada Growth").
 * The old check was one exact substring, so multi-word searches missed. */
export function matchesQuery(title: string, query: string): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const haystack = normalizeText(title);
  return words.every((w) => haystack.includes(w));
}

/** Same card, but its outbound link is tagged as coming from search (what
 * getUnifiedMerchantOffers' linkParams did per request) so clicks stay
 * attributable to the query. */
export function retagForSearch(
  card: UnifiedOfferCard,
  query: string,
): UnifiedOfferCard {
  if (!card.href) return card;
  const url = new URL(card.href, "https://placeholder.invalid");
  url.searchParams.set("source", "search");
  url.searchParams.set("campaign", query);
  return { ...card, href: `${url.pathname}${url.search}` };
}

/** Pure: marketplace offers (never Amazon, which has its own search path)
 * from the pool whose title matches, best signal first. */
export function searchPoolCards(
  pool: UnifiedOfferCard[],
  query: string,
): UnifiedOfferCard[] {
  return pool
    .filter((c) => c.merchant !== "AMAZON" && matchesQuery(c.title, query))
    .map((c) => retagForSearch(c, query))
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1));
}

/**
 * Search over EVERY active offer (the cached pool, not only the top 200 the
 * per-request path can afford), merged with Amazon's own search, ranked by
 * the same commission-free signal and paged in memory.
 */
export async function searchOffers(input: {
  query: string;
  page?: number;
}): Promise<SearchUnifiedOffersResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const [amazonResult, pool] = await Promise.all([
    getOfertas({ query: input.query, page: 1, pageSize: AMAZON_SEARCH_LIMIT }),
    getOffersPool(),
  ]);
  const all = [
    ...amazonResult.items.map(mapAmazonProductToUnifiedCard),
    ...searchPoolCards(pool, input.query),
  ].sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1));

  const totalPages = Math.max(1, Math.ceil(all.length / SEARCH_PAGE_SIZE));
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  return {
    items: stripNoindexDetailLinks(all.slice(start, start + SEARCH_PAGE_SIZE)),
    page,
    totalPages,
  };
}

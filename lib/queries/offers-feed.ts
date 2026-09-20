import { getOfertas } from "@/lib/queries/products";
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

export async function getOffersPool(
  now: number = Date.now(),
): Promise<UnifiedOfferCard[]> {
  if (cached && now - cached.at < POOL_TTL_MS) return cached.cards;
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

export interface OffersPage {
  items: UnifiedOfferCard[];
  page: number;
  total: number;
  hasMore: boolean;
}

/** Pure paging/filtering over an already ranked list. */
export function paginateOffers(
  cards: UnifiedOfferCard[],
  options: { category?: string | null; page?: number; pageSize?: number },
): OffersPage {
  const pageSize = options.pageSize ?? FEED_PAGE_SIZE;
  const category =
    options.category && isOfferCategorySlug(options.category)
      ? options.category
      : null;
  const filtered = category
    ? cards.filter((c) => c.categorySlug === category)
    : cards;
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
  page?: number;
}): Promise<OffersPage> {
  return paginateOffers(await getOffersPool(), options);
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

export async function getOfferCategoryCounts(): Promise<CategoryCount[]> {
  return countByCategory(await getOffersPool());
}

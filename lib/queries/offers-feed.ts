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
import {
  applyEngagementBoost,
  getEngagementSignals,
} from "@/lib/queries/engagement-boost";

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
  const [amazonResult, merchantOffers, engagementSignals] = await Promise.all([
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
    // Best-effort: a failure here must never take the whole feed down —
    // it just means this build goes out with no engagement boost.
    getEngagementSignals().catch((error) => {
      console.error("offers_feed.engagement_signals_failed", error);
      return { clicksByCardId: new Map(), viewsBySlug: new Map() };
    }),
  ]);
  const all = [
    ...amazonResult.items.map(mapAmazonProductToUnifiedCard),
    ...merchantOffers,
  ];
  const boosted = applyEngagementBoost(all, engagementSignals);
  return interleaveByMerchant(selectTopUnifiedOffers(boosted, boosted.length));
}

/**
 * Mixes the stores in proportion to how many offers each has, keeping every
 * store's own ranking. Without it, one store whose offers score higher takes
 * whole pages (found 2026-09-25: after Mercado Livre products got a score they
 * would have filled pages 1-11 and pushed all of Shopee out of the top). At
 * each step it takes from the store that is furthest behind its fair share, so
 * a 525/270 pool alternates roughly 2 Shopee : 1 Mercado Livre all the way.
 */
export function interleaveByMerchant(
  ranked: UnifiedOfferCard[],
): UnifiedOfferCard[] {
  const queues = new Map<string, UnifiedOfferCard[]>();
  for (const card of ranked) {
    const queue = queues.get(card.merchant) ?? [];
    queue.push(card);
    queues.set(card.merchant, queue);
  }
  if (queues.size <= 1) return ranked;

  const total = new Map([...queues].map(([m, q]) => [m, q.length]));
  const taken = new Map([...queues.keys()].map((m) => [m, 0]));
  const rank = new Map(ranked.map((card, i) => [card, i]));
  const out: UnifiedOfferCard[] = [];
  while (out.length < ranked.length) {
    let best: string | null = null;
    let bestRatio = Infinity;
    let bestHead = Infinity;
    for (const [merchant, queue] of queues) {
      const done = taken.get(merchant) ?? 0;
      if (done >= queue.length) continue;
      // fraction of its own list already shown; the furthest behind goes next,
      // ties go to the store whose next offer ranks higher overall
      const ratio = done / (total.get(merchant) ?? 1);
      const head = rank.get(queue[done]!) ?? Infinity;
      if (ratio < bestRatio || (ratio === bestRatio && head < bestHead)) {
        best = merchant;
        bestRatio = ratio;
        bestHead = head;
      }
    }
    const merchant = best!;
    const done = taken.get(merchant) ?? 0;
    out.push(queues.get(merchant)![done]!);
    taken.set(merchant, done + 1);
  }
  return out;
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

/** Words people type that products spell differently. Small on purpose: only
 * pairs that are the same thing to a shopper. */
const SYNONYMS: Record<string, string[]> = {
  celular: ["smartphone"],
  smartphone: ["celular"],
  geladeira: ["refrigerador"],
  refrigerador: ["geladeira"],
  notebook: ["laptop"],
  laptop: ["notebook"],
  tv: ["televisao", "smart tv"],
  televisao: ["tv"],
  fritadeira: ["air fryer", "airfryer"],
};

function alternatives(word: string): string[] {
  return [word, ...(SYNONYMS[word] ?? []).map(normalizeText)];
}

const collapse = (value: string) =>
  normalizeText(value).replace(/[^a-z0-9]+/g, "");

function queryWords(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

/** Every word of the query must appear in the title, in any order, ignoring
 * accents and case ("creatina growth" finds "Creatina Monohidratada Growth").
 * A word also matches its synonym ("celular" ~ "smartphone"), and the whole
 * query matches with the spaces removed ("air fryer" ~ "airfryer"). */
export function matchesQuery(title: string, query: string): boolean {
  const words = queryWords(query);
  if (words.length === 0) return false;
  const haystack = normalizeText(title);
  const collapsedTitle = collapse(title);
  if (
    words.every((w) =>
      alternatives(w).some(
        (alt) =>
          haystack.includes(alt) || collapsedTitle.includes(collapse(alt)),
      ),
    )
  )
    return true;
  const whole = collapse(query);
  return whole.length >= 4 && collapsedTitle.includes(whole);
}

/** Words that mark the thing before them as an accessory or compatible item
 * ("Cabo PARA iPhone", "Suporte PARA celular"). */
const ACCESSORY_MARKERS = new Set(["para", "pra", "compativel", "compat", "p"]);

/** Accessory nouns: "Cabo iPhone", "Capa Galaxy" name an accessory, not the
 * device. Only counts when the searched word comes after them. */
const ACCESSORY_NOUNS = new Set([
  "cabo",
  "carregador",
  "capa",
  "capinha",
  "case",
  "pelicula",
  "suporte",
  "fonte",
  "adaptador",
  "protetor",
]);

/**
 * How well a title IS what was searched, 0 (best) to 3. A product whose name
 * starts with the searched word is the thing itself; one that only mentions it
 * late ("Kit potes ... Airfryer") or as a compatibility note ("Cabo para
 * iPhone") is not. Ranking by this first, then by demand signal, is what makes
 * "air fryer" show air fryers before the containers that fit in one.
 */
export function searchRelevanceTier(
  title: string,
  query: string,
): 0 | 1 | 2 | 3 {
  const words = queryWords(query).flatMap(alternatives);
  const tw = normalizeText(title)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let pos = -1;
  for (let i = 0; i < tw.length && pos < 0; i++) {
    if (
      words.some((w) =>
        w
          .split(" ")
          .some(
            (part) =>
              part.length >= 3 &&
              (tw[i]!.startsWith(part) ||
                (tw[i]!.length >= 3 && part.startsWith(tw[i]!))),
          ),
      )
    )
      pos = i;
  }
  if (pos < 0) return 2;
  if (
    tw
      .slice(0, pos)
      .some((w) => ACCESSORY_MARKERS.has(w) || ACCESSORY_NOUNS.has(w))
  )
    return 3;
  return pos <= 2 ? 0 : pos <= 5 ? 1 : 2;
}

/** Best relevance tier first; demand signal breaks ties. */
export function rankForSearch<
  T extends { title: string; opportunitySignal: number | null },
>(cards: T[], query: string): T[] {
  return cards
    .map((c) => ({ c, tier: searchRelevanceTier(c.title, query) }))
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (b.c.opportunitySignal ?? -1) - (a.c.opportunitySignal ?? -1),
    )
    .map((x) => x.c);
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
  return rankForSearch(
    pool
      .filter((c) => c.merchant !== "AMAZON" && matchesQuery(c.title, query))
      .map((c) => retagForSearch(c, query)),
    query,
  );
}

/** When nothing has ALL the words ("tênis nike"), offer what has at least one
 * of them, the ones with more of the words first. Marketplace offers only. */
export function searchPoolCardsPartial(
  pool: UnifiedOfferCard[],
  query: string,
): UnifiedOfferCard[] {
  const words = queryWords(query).filter((w) => w.length >= 3);
  if (words.length < 2) return [];
  const scored = pool
    .filter((c) => c.merchant !== "AMAZON")
    .map((c) => {
      const hay = normalizeText(c.title);
      const hits = words.filter((w) =>
        alternatives(w).some((alt) => hay.includes(alt)),
      ).length;
      return { c, hits };
    })
    .filter((x) => x.hits > 0);
  const best = Math.max(0, ...scored.map((x) => x.hits));
  return rankForSearch(
    scored
      .filter((x) => x.hits === best)
      .map((x) => retagForSearch(x.c, query)),
    query,
  );
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
  const amazon = amazonResult.items.map(mapAmazonProductToUnifiedCard);
  let all = rankForSearch(
    [...amazon, ...searchPoolCards(pool, input.query)],
    input.query,
  );
  let partial = false;
  if (all.length === 0) {
    all = searchPoolCardsPartial(pool, input.query);
    partial = all.length > 0;
  }

  const totalPages = Math.max(1, Math.ceil(all.length / SEARCH_PAGE_SIZE));
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  return {
    items: stripNoindexDetailLinks(all.slice(start, start + SEARCH_PAGE_SIZE)),
    page,
    totalPages,
    total: all.length,
    partial,
  };
}

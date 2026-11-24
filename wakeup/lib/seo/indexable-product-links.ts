import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";

/**
 * A /produto/[slug] page that fails the publication gate is noindex on
 * purpose. If the offer cards still link to it, Googlebot follows the link,
 * finds the noindex, and Search Console reports "Excluded by noindex".
 * So a card only links to a product page that is in the sitemap — the very
 * same list app/sitemap.ts is built from.
 *
 * That list is the heaviest read in the app (~10 s cold), so it must never
 * sit in a visitor's request path: `stripNoindexDetailLinks` only PEEKS at a
 * cached copy and, when it is missing or stale, refreshes it in the
 * background. Until the first copy exists the links are left as they are
 * (fail open) — a missing "Ver detalhes" link costs visitors more than a rare
 * crawl of a noindex page.
 */
const TTL_MS = 30 * 60 * 1000;

// Process-wide (globalThis) for the same reason as lib/queries/offers-feed.ts:
// one copy of the list, however many route bundles load this module.
const g = globalThis as unknown as {
  __indexableSlugsState?: {
    cached: { at: number; slugs: Set<string> } | null;
    refreshing: Promise<void> | null;
  };
};
const state = (g.__indexableSlugsState ??= { cached: null, refreshing: null });

function refresh(): void {
  if (state.refreshing) return;
  state.refreshing = listIndexableMerchantProductUrls()
    .then((urls) => {
      state.cached = {
        at: Date.now(),
        slugs: new Set(urls.map((u) => u.slug)),
      };
    })
    .catch((error) => {
      console.error("seo.indexable_slugs_unavailable", error);
    })
    .finally(() => {
      state.refreshing = null;
    });
}

/** Cached slug set (possibly stale) or null if none exists yet; never waits. */
export function peekIndexableProductSlugs(
  now: number = Date.now(),
): Set<string> | null {
  if (!state.cached || now - state.cached.at >= TTL_MS) refresh();
  return state.cached ? state.cached.slugs : null;
}

/** Drops `detailHref` from any card whose product page is not indexable. */
export function stripNoindexDetailLinks<T extends { detailHref?: string }>(
  cards: T[],
): T[] {
  if (!cards.some((c) => c.detailHref)) return cards;
  const slugs = peekIndexableProductSlugs();
  if (!slugs) return cards;
  return cards.map((card) => {
    if (!card.detailHref) return card;
    const slug = decodeURIComponent(
      card.detailHref.replace(/^\/produto\//, ""),
    );
    if (slugs.has(slug)) return card;
    const { detailHref, ...rest } = card;
    void detailHref;
    return rest as T;
  });
}

/** Test hooks. */
export function setIndexableProductSlugsForTest(
  slugs: string[] | null,
  at: number = Date.now(),
): void {
  state.cached = slugs ? { at, slugs: new Set(slugs) } : null;
  state.refreshing = null;
}
export async function waitForIndexableRefreshForTest(): Promise<void> {
  await state.refreshing;
}

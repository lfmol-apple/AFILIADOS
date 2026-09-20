import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";

/**
 * A /produto/[slug] page that fails the publication gate is noindex on
 * purpose. If the offer cards still link to it, Googlebot follows the link,
 * finds the noindex, and Search Console reports "Excluded by noindex".
 * So a card only links to a product page that is in the sitemap — the very
 * same list app/sitemap.ts is built from, cached for a few minutes because
 * computing it is the heaviest read in the app.
 */
const TTL_MS = 5 * 60 * 1000;

let cached: { at: number; slugs: Set<string> } | null = null;
let inflight: Promise<Set<string>> | null = null;

export async function getIndexableProductSlugs(
  now: number = Date.now(),
): Promise<Set<string>> {
  if (cached && now - cached.at < TTL_MS) return cached.slugs;
  inflight ??= listIndexableMerchantProductUrls()
    .then((urls) => {
      const slugs = new Set(urls.map((u) => u.slug));
      cached = { at: Date.now(), slugs };
      return slugs;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drops `detailHref` from any card whose product page is not indexable.
 * Fails open (keeps the links) if the list cannot be computed: a missing
 * "Ver detalhes" link is worse for visitors than a rare noindex crawl. */
export async function withIndexableDetailLinks<
  T extends { detailHref?: string },
>(cards: T[]): Promise<T[]> {
  if (!cards.some((c) => c.detailHref)) return cards;
  let slugs: Set<string>;
  try {
    slugs = await getIndexableProductSlugs();
  } catch (error) {
    console.error("seo.indexable_slugs_unavailable", error);
    return cards;
  }
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

/** Test hook. */
export function resetIndexableProductSlugsCache(): void {
  cached = null;
  inflight = null;
}

import { classifyOffer } from "@/lib/offers/categories";
import { getOffersPool } from "@/lib/queries/offers-feed";
import { stripNoindexDetailLinks } from "@/lib/seo/indexable-product-links";
import type { UnifiedOfferCard } from "@/lib/queries/unified-offers";

export interface SimilarOffers {
  categorySlug: string;
  items: UnifiedOfferCard[];
}

/**
 * Pure selection step (testable): same-category cards that have a public,
 * indexable product page, excluding the product itself. Keeps the pool's
 * order — the pool is already ranked without commission — and never pads.
 */
export function pickSimilarOffers(
  pool: UnifiedOfferCard[],
  input: { slug: string; title: string; limit: number },
): SimilarOffers {
  const self = pool.find((c) => c.detailHref === `/produto/${input.slug}`);
  const categorySlug =
    self?.categorySlug ?? classifyOffer({ title: input.title });
  // "Outros" is a catch-all, not a real category — offers there are not
  // actually similar, so show none rather than unrelated products.
  if (categorySlug === "outros") return { categorySlug, items: [] };
  const own = `/produto/${input.slug}`;
  const candidates = pool.filter(
    (c) =>
      c.detailHref &&
      c.detailHref !== own &&
      c.categorySlug === categorySlug &&
      c.imageUrl,
  );
  const items = stripNoindexDetailLinks(candidates)
    .filter((c) => c.detailHref)
    .slice(0, input.limit);
  return { categorySlug, items };
}

export async function getSimilarOffers(input: {
  slug: string;
  title: string;
  limit?: number;
}): Promise<SimilarOffers> {
  const pool = await getOffersPool();
  return pickSimilarOffers(pool, {
    slug: input.slug,
    title: input.title,
    limit: input.limit ?? 8,
  });
}

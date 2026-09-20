import type { Metadata } from "next";
import { offerCategoryLabel } from "@/lib/offers/categories";
import { DEFAULT_SORT, offersHref, type OffersView } from "@/lib/offers/view";

/**
 * Search-engine metadata for /ofertas and its views. Rules:
 * - A category is a real landing page ("ofertas de pet"): own title,
 *   description and a self canonical, so it can rank for that search.
 * - ?pagina=N pages are a real series: each canonicals to itself.
 * - Sort and store variants only reorder/filter the same items: noindex and
 *   canonical to the view without them.
 * - Search results (?q=) are never indexed.
 * Everything is noindex while the page itself is not indexable (no offers).
 */
export function buildOffersMetadata(input: {
  view: OffersView;
  indexable: boolean;
  hasQuery: boolean;
}): Metadata {
  const { view, indexable, hasQuery } = input;
  const label = view.category ? offerCategoryLabel(view.category) : null;
  const pageSuffix = view.page > 1 ? ` — página ${view.page}` : "";

  const title = label
    ? `Ofertas de ${label}${pageSuffix}`
    : `Ofertas${pageSuffix}`;
  const description = label
    ? `As melhores ofertas de ${label} do Mercado Livre e da Shopee agora, ordenadas por demanda e qualidade da oferta, sem viés de comissão. Atualizado automaticamente.`
    : "As melhores oportunidades reais do PreçoCaindo agora, em qualquer loja parceira — priorizadas por demanda, preço e evidência real.";

  const canonical = offersHref(
    {
      category: view.category,
      sort: DEFAULT_SORT,
      store: null,
      page: view.page,
    },
    { page: view.page },
  );

  const isVariant = view.sort !== DEFAULT_SORT || view.store !== null;
  const noindex = !indexable || hasQuery || isVariant;

  return {
    title,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

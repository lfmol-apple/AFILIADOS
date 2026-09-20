import { isOfferCategorySlug } from "@/lib/offers/categories";

/**
 * The /ofertas "view": which category, sort order and store the visitor
 * picked. One place parses it from the URL and builds URLs back, so the
 * page, the category column, the toolbar and the infinite-scroll API can
 * never disagree. Defaults are omitted from URLs (/ofertas stays clean).
 */
export const SORT_OPTIONS = [
  { slug: "relevancia", label: "Relevância" },
  { slug: "desconto", label: "Maior desconto" },
  { slug: "menor-preco", label: "Menor preço" },
] as const;

export type OfferSort = (typeof SORT_OPTIONS)[number]["slug"];
export const DEFAULT_SORT: OfferSort = "relevancia";

export const STORE_OPTIONS = [
  { slug: "mercado-livre", label: "Mercado Livre", merchant: "MERCADO_LIVRE" },
  { slug: "shopee", label: "Shopee", merchant: "SHOPEE" },
  { slug: "amazon", label: "Amazon", merchant: "AMAZON" },
] as const;

export type OfferStore = (typeof STORE_OPTIONS)[number]["slug"];
export type OfferMerchant = (typeof STORE_OPTIONS)[number]["merchant"];

export interface OffersView {
  category: string | null;
  sort: OfferSort;
  store: OfferStore | null;
}

export function isOfferSort(value: string): value is OfferSort {
  return SORT_OPTIONS.some((s) => s.slug === value);
}

export function isOfferStore(value: string): value is OfferStore {
  return STORE_OPTIONS.some((s) => s.slug === value);
}

export function storeToMerchant(
  store: OfferStore | null,
): OfferMerchant | null {
  return STORE_OPTIONS.find((s) => s.slug === store)?.merchant ?? null;
}

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Unknown or malformed values fall back to the defaults, never an error. */
export function parseOffersView(
  params: Record<string, string | string[] | undefined>,
): OffersView {
  const category = first(params.categoria);
  const sort = first(params.ordem);
  const store = first(params.loja);
  return {
    category: category && isOfferCategorySlug(category) ? category : null,
    sort: sort && isOfferSort(sort) ? sort : DEFAULT_SORT,
    store: store && isOfferStore(store) ? store : null,
  };
}

/** URL for a view, with `override` applied on top. Defaults are dropped. */
export function offersHref(
  view: OffersView,
  override: Partial<OffersView> = {},
): string {
  const next = { ...view, ...override };
  const query = new URLSearchParams();
  if (next.category) query.set("categoria", next.category);
  if (next.sort !== DEFAULT_SORT) query.set("ordem", next.sort);
  if (next.store) query.set("loja", next.store);
  const qs = query.toString();
  return qs ? `/ofertas?${qs}` : "/ofertas";
}

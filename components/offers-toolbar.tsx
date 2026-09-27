import Link from "next/link";
import { FilterSheet } from "@/components/filter-sheet";
import {
  SORT_OPTIONS,
  STORE_OPTIONS,
  offersHref,
  type OffersView,
} from "@/lib/offers/view";

const chip =
  "flex min-h-10 items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition";
const chipIdle = "border-border-subtle bg-background hover:border-brand/50";
const chipActive = "border-brand bg-brand/10 text-brand font-semibold";

type StoreOption = (typeof STORE_OPTIONS)[number];

function SortGroup({ view }: { view: OffersView }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-foreground/50 shrink-0 text-xs font-bold tracking-wide uppercase">
        Ordenar
      </span>
      <ul className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((o) => {
          const active = view.sort === o.slug;
          return (
            <li key={o.slug} className="shrink-0">
              <Link
                href={offersHref(view, { sort: o.slug })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`${chip} ${active ? chipActive : chipIdle}`}
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StoreGroup({
  view,
  stores,
}: {
  view: OffersView;
  stores: StoreOption[];
}) {
  if (stores.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-foreground/50 shrink-0 text-xs font-bold tracking-wide uppercase">
        Loja
      </span>
      <ul className="flex flex-wrap gap-2">
        <li className="shrink-0">
          <Link
            href={offersHref(view, { store: null })}
            scroll={false}
            aria-current={view.store === null ? "true" : undefined}
            className={`${chip} ${view.store === null ? chipActive : chipIdle}`}
          >
            Todas
          </Link>
        </li>
        {stores.map((s) => {
          const active = view.store === s.slug;
          return (
            <li key={s.slug} className="shrink-0">
              <Link
                href={offersHref(view, { store: s.slug })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`${chip} ${active ? chipActive : chipIdle}`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Sort + store controls above the offers grid. Plain links (no JS needed):
 * every choice is a URL, so it is shareable and the back button works. The
 * category stays as the visitor left it. Wide screens show both groups inline;
 * phones fold them into one button (FilterSheet) so the first offers stay
 * above the fold. The two renderings share the same group components.
 */
export function OffersToolbar({
  view,
  total,
  stores,
}: {
  view: OffersView;
  total: number;
  /** Stores that actually have offers right now — never offer an empty filter. */
  stores: string[];
}) {
  const availableStores = STORE_OPTIONS.filter((s) =>
    stores.includes(s.merchant),
  );
  const sortLabel =
    SORT_OPTIONS.find((o) => o.slug === view.sort)?.label ?? "Relevância";
  const storeLabel = view.store
    ? availableStores.find((s) => s.slug === view.store)?.label
    : undefined;
  const summary = storeLabel ? `${sortLabel} · ${storeLabel}` : sortLabel;

  return (
    <div className="mb-4 sm:mb-5 sm:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground/60 text-sm">
          <strong className="text-foreground">{total}</strong>{" "}
          {total === 1 ? "oferta" : "ofertas"}
        </p>
        <div className="sm:hidden">
          <FilterSheet summary={summary}>
            <SortGroup view={view} />
            <StoreGroup view={view} stores={availableStores} />
          </FilterSheet>
        </div>
      </div>

      <div className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <SortGroup view={view} />
        <StoreGroup view={view} stores={availableStores} />
      </div>
    </div>
  );
}

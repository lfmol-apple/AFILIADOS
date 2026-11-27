import Link from "next/link";
import { FilterSheet } from "@/components/filter-sheet";
import { SORT_OPTIONS, offersHref, type OffersView } from "@/lib/offers/view";

const chip =
  "flex min-h-10 items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition";
const chipIdle = "border-border-subtle bg-background hover:border-brand/50";
const chipActive = "border-brand bg-brand/10 text-brand font-semibold";

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

/**
 * Sort control above the offers grid. Plain links (no JS needed): every
 * choice is a URL, so it is shareable and the back button works. The
 * category stays as the visitor left it. The store filter used to live
 * here too (as a plain gray chip) — owner's request, 2026-11-27: it's now
 * its own centered, brand-colored row right below the page header (see
 * components/store-brand-bar.tsx), so this toolbar is sort-only now.
 */
export function OffersToolbar({
  view,
  total,
}: {
  view: OffersView;
  total: number;
}) {
  const sortLabel =
    SORT_OPTIONS.find((o) => o.slug === view.sort)?.label ?? "Relevância";

  return (
    <div className="mb-4 sm:mb-5 sm:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-foreground/60 text-sm">
          <strong className="text-foreground">{total}</strong>{" "}
          {total === 1 ? "oferta" : "ofertas"}
        </p>
        <div className="sm:hidden">
          <FilterSheet summary={sortLabel}>
            <SortGroup view={view} />
          </FilterSheet>
        </div>
      </div>

      <div className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <SortGroup view={view} />
      </div>
    </div>
  );
}

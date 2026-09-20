import Link from "next/link";
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

/**
 * Sort + store controls above the offers grid. Plain links (no JS needed):
 * every choice is a URL, so it is shareable and the back button works. The
 * category stays as the visitor left it. On phones the two groups scroll
 * sideways instead of wrapping into a tall block.
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

  return (
    <div className="mb-5 space-y-3">
      <p className="text-foreground/60 text-sm">
        <strong className="text-foreground">{total}</strong>{" "}
        {total === 1 ? "oferta" : "ofertas"}
      </p>

      <div className="-mx-4 flex flex-col gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:overflow-visible sm:px-0">
        <div className="flex items-center gap-2">
          <span className="text-foreground/50 shrink-0 text-xs font-bold tracking-wide uppercase">
            Ordenar
          </span>
          <ul className="flex gap-2">
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

        {availableStores.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-foreground/50 shrink-0 text-xs font-bold tracking-wide uppercase">
              Loja
            </span>
            <ul className="flex gap-2">
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
              {availableStores.map((s) => {
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
        )}
      </div>
    </div>
  );
}

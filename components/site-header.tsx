import Link from "next/link";
import { OFFER_CATEGORIES } from "@/lib/offers/categories";

const NAV_CATEGORIES = OFFER_CATEGORIES.filter((c) => c.slug !== "outros");

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m14 14 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchForm({ id, className }: { id: string; className: string }) {
  return (
    <form action="/ofertas" method="GET" role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        Buscar produto
      </label>
      <div className="relative">
        <SearchIcon className="text-foreground/40 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <input
          id={id}
          type="search"
          name="q"
          placeholder="Buscar produto, marca ou categoria"
          className="border-border-subtle bg-surface-muted focus:border-brand w-full rounded-full border py-2.5 pr-4 pl-10 text-sm outline-none"
        />
      </div>
    </form>
  );
}

const chip =
  "border-border-subtle hover:border-brand flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap";

/**
 * Site header, in two parts that render as siblings so the first can be
 * sticky for the whole page (a sticky element only sticks within its
 * parent):
 *
 * 1. A compact sticky bar — logo, and on wide screens the search, the
 *    Categorias menu, Achados and Guias. "Ofertas" is the one loud element
 *    (.cta-offers in globals.css) and is always in this bar.
 * 2. Phones only: a non-sticky strip with the search box and a scrollable
 *    row of chips (Achados, Guias, then every category) — everything is one
 *    thumb-swipe away without a hidden menu.
 *
 * The Categorias dropdown is CSS-only (group-hover / focus-within) so it
 * needs no client JS and stays keyboard accessible.
 */
export function SiteHeader() {
  return (
    <>
      <header className="border-border-subtle bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 sm:gap-5 sm:px-6 sm:py-3">
          <Link
            href="/"
            aria-label="PreçoCaindo — página inicial"
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt=""
              width={64}
              height={64}
              className="h-12 w-12 min-[360px]:h-14 min-[360px]:w-14 sm:h-16 sm:w-16"
            />
            <span className="text-base font-extrabold tracking-tight min-[360px]:text-lg min-[380px]:text-xl sm:text-2xl">
              PreçoCaindo
            </span>
          </Link>

          <SearchForm
            id="header-search"
            className="ml-auto hidden max-w-sm flex-1 lg:block"
          />

          <nav
            aria-label="Principal"
            className="ml-auto flex items-center gap-3 text-sm sm:gap-5 lg:ml-0"
          >
            <div className="group relative hidden sm:block">
              <Link
                href="/ofertas"
                className="hover:text-brand flex items-center gap-1 py-2 font-medium"
                aria-haspopup="true"
              >
                Categorias
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="m5 8 5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="border-border-subtle bg-background grid w-[26rem] grid-cols-2 gap-x-2 gap-y-0.5 rounded-xl border p-2 shadow-xl">
                  {NAV_CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/ofertas?categoria=${c.slug}`}
                        className="hover:bg-surface-muted block rounded-lg px-3 py-2 text-sm"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Link
              href="/achados"
              className="hover:text-brand hidden font-medium sm:inline"
            >
              Achados
            </Link>
            <Link
              href="/guias"
              className="hover:text-brand hidden font-medium sm:inline"
            >
              Guias
            </Link>
            <Link
              href="/ofertas"
              className="cta-offers text-[0.95rem] sm:text-base"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 sm:h-5 sm:w-5"
                aria-hidden
              >
                <path
                  d="M10.6 2.5H16a1.5 1.5 0 0 1 1.5 1.5v5.4a1.5 1.5 0 0 1-.44 1.06l-6.6 6.6a1.5 1.5 0 0 1-2.12 0L3.4 12.66a1.5 1.5 0 0 1 0-2.12l6.14-6.6a1.5 1.5 0 0 1 1.06-.44Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="13.4" cy="6.6" r="1.1" fill="currentColor" />
              </svg>
              Ofertas
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-border-subtle border-b sm:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <SearchForm id="header-search-mobile" className="w-full" />
          <ul
            aria-label="Atalhos"
            className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5"
          >
            <li className="shrink-0">
              <Link href="/achados" className={`${chip} bg-surface-muted`}>
                Achados
              </Link>
            </li>
            <li className="shrink-0">
              <Link href="/guias" className={`${chip} bg-surface-muted`}>
                Guias
              </Link>
            </li>
            {NAV_CATEGORIES.map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link href={`/ofertas?categoria=${c.slug}`} className={chip}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";

/**
 * The hero search (app/page.tsx) is the primary search — this one is a
 * secondary, compact shortcut for navigating away from the home page. It
 * intentionally does not compete for width or visual weight with the hero
 * input (project brief: "não deve competir com a principal").
 */
export function SiteHeader() {
  return (
    <header className="border-border-subtle max-w-[100vw] overflow-x-hidden border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" width={28} height={28} className="h-7 w-7" />
          PreçoCaindo
        </Link>

        <form
          action="/ofertas"
          method="GET"
          className="ml-auto hidden max-w-xs flex-1 sm:block"
        >
          <label htmlFor="header-search" className="sr-only">
            Buscar produto
          </label>
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="text-foreground/40 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              aria-hidden
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m14 14 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder="Buscar"
              className="border-border-subtle bg-surface-muted focus:border-brand w-full rounded-full border py-1.5 pr-3 pl-9 text-sm outline-none"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-4 text-sm sm:ml-4">
          {/* Mobile-only search toggle — before this, the icon just
           * re-linked to /ofertas with no way to actually type a query once
           * away from the home page's hero search (found live, 2026-09-14).
           * <details> gives a real, focusable input with zero client JS.
           * The revealed form is `fixed` (viewport-relative), not
           * `absolute` — <header> has overflow-x-hidden, which forces
           * overflow-y to auto as a side effect (CSS spec), clipping any
           * absolutely-positioned child that extends past the header's own
           * box; `fixed` ignores that ancestor entirely. Confirmed via
           * elementFromPoint in real testing, 2026-09-14: an `absolute`
           * version rendered with correct styles/bounding box but was
           * genuinely unreachable to a real tap — main content painted
           * on top of it. */}
          <details className="sm:hidden">
            <summary
              aria-label="Buscar produto"
              className="hover:text-brand flex list-none items-center [&::-webkit-details-marker]:hidden"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </summary>
            <form
              action="/ofertas"
              method="GET"
              className="fixed inset-x-4 top-16 z-50"
            >
              <label htmlFor="header-search-mobile" className="sr-only">
                Buscar produto
              </label>
              <input
                id="header-search-mobile"
                type="search"
                name="q"
                autoFocus
                placeholder="Buscar"
                className="border-border-subtle bg-background focus:border-brand w-full rounded-full border px-4 py-2 text-sm shadow-md outline-none"
              />
            </form>
          </details>
          <Link href="/ofertas" className="hover:text-brand hidden sm:inline">
            Ofertas
          </Link>
          <Link href="/achados" className="hover:text-brand hidden sm:inline">
            Achados
          </Link>
        </nav>
      </div>
    </header>
  );
}

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
          <span className="bg-brand text-brand-foreground flex h-7 w-7 items-center justify-center rounded-full text-sm">
            ↓
          </span>
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
          <Link
            href="/ofertas"
            aria-label="Buscar produto"
            className="hover:text-brand sm:hidden"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-5 w-5"
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
          </Link>
          <Link href="/ofertas" className="hover:text-brand hidden sm:inline">
            Ofertas
          </Link>
          <Link href="/guias" className="hover:text-brand hidden sm:inline">
            Guias
          </Link>
          <Link
            href="/como-funciona"
            className="hover:text-brand hidden sm:inline"
          >
            Como funciona
          </Link>
          <Link
            href="/transparencia"
            className="hover:text-brand hidden sm:inline"
          >
            Transparência
          </Link>
        </nav>
      </div>
    </header>
  );
}

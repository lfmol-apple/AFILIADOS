import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-border-subtle border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <span className="bg-brand text-brand-foreground flex h-7 w-7 items-center justify-center rounded-full text-sm">
            ↓
          </span>
          PreçoCaindo
        </Link>

        <form
          action="/ofertas"
          method="GET"
          className="order-3 w-full sm:order-2 sm:ml-4 sm:flex-1"
        >
          <input
            type="search"
            name="q"
            placeholder="O que você está pensando em comprar?"
            className="border-border-subtle bg-surface-muted focus:border-brand w-full rounded-full border px-4 py-2 text-sm outline-none"
          />
        </form>

        <nav className="order-2 ml-auto flex items-center gap-4 text-sm sm:order-3">
          <Link href="/ofertas" className="hover:text-brand">
            Ofertas
          </Link>
          <Link href="/transparencia" className="hover:text-brand">
            Transparência
          </Link>
        </nav>
      </div>
    </header>
  );
}

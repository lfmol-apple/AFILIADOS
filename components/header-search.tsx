"use client";

import { usePathname } from "next/navigation";

/**
 * The header's search box. Hidden on the home page, which has its own large
 * search right below the hero carousel — two boxes on one screen is noise.
 * Everywhere else it is the only search, so it stays. usePathname is
 * available during SSR, so there is no flash of a box that then disappears.
 */
export function HeaderSearch({
  id,
  className,
}: {
  id: string;
  className: string;
}) {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <form action="/ofertas" method="GET" role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        Buscar produto
      </label>
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground/40 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
          aria-hidden
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m14 14 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
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

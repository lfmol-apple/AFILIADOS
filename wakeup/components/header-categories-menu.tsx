"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OfferCategoryTile } from "@/components/offer-category-icon";

/**
 * "Categorias" menu of the wide-screen header. /ofertas already shows the full
 * category list beside the offers, so there it would be a second, competing
 * list: the menu is dropped on that page. Everywhere else it opens (hover or
 * keyboard focus, no JS state) as a two-column panel with an icon per
 * category. usePathname works during SSR, so nothing flashes.
 */
export function HeaderCategoriesMenu({
  categories,
}: {
  categories: { slug: string; label: string }[];
}) {
  const pathname = usePathname();
  if (pathname === "/ofertas") return null;

  return (
    <div className="group relative hidden sm:block">
      <Link
        href="/ofertas"
        className="hover:text-brand group-focus-within:text-brand flex items-center gap-1 py-2 font-medium"
        aria-haspopup="true"
      >
        Categorias
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
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
        <div className="border-border-subtle bg-background w-[30rem] rounded-2xl border p-2 shadow-2xl">
          <ul className="grid grid-cols-2 gap-0.5">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/ofertas?categoria=${c.slug}`}
                  className="hover:bg-brand/8 focus-visible:bg-brand/8 flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-sm"
                >
                  <OfferCategoryTile slug={c.slug} />
                  <span className="leading-tight">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/ofertas"
            className="text-brand hover:bg-brand/8 mt-1 flex min-h-10 items-center justify-center rounded-xl text-sm font-semibold"
          >
            Ver todas as ofertas →
          </Link>
        </div>
      </div>
    </div>
  );
}

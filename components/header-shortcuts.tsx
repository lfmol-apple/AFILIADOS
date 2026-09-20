"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const chip =
  "border-border-subtle hover:border-brand flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap";

/**
 * Phone-only shortcut strip under the header search. On /ofertas the page
 * already shows its own category chips right below, so repeating the
 * categories here would be noise: there the strip keeps only "Achados".
 * (Guias is deliberately not in the menu — the owner's call; it stays in
 * the footer and is still linked from the home page.) Everywhere else the categories are one swipe away.
 */
export function HeaderShortcuts({
  categories,
}: {
  categories: { slug: string; label: string }[];
}) {
  const pathname = usePathname();
  const showCategories = pathname !== "/ofertas";

  return (
    <ul
      aria-label="Atalhos"
      className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5"
    >
      <li className="shrink-0">
        <Link href="/achados" className={`${chip} bg-surface-muted`}>
          Achados
        </Link>
      </li>
      {showCategories &&
        categories.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link href={`/ofertas?categoria=${c.slug}`} className={chip}>
              {c.label}
            </Link>
          </li>
        ))}
    </ul>
  );
}

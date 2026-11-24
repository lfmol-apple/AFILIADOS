"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const chip =
  "border-border-subtle hover:border-brand flex min-h-11 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap";

/**
 * Phone-only category strip under the header search (Achados sits next to
 * the search box itself). On /ofertas the page shows its own sticky category
 * bar, so the strip is dropped there. (Guias is deliberately not in the
 * menu — the owner's call; it stays in the footer and is still linked from
 * the home page.)
 */
export function HeaderShortcuts({
  categories,
}: {
  categories: { slug: string; label: string }[];
}) {
  const pathname = usePathname();
  if (pathname === "/ofertas") return null;

  return (
    <ul
      aria-label="Atalhos"
      className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5"
    >
      {categories.map((c) => (
        <li key={c.slug} className="shrink-0">
          <Link href={`/ofertas?categoria=${c.slug}`} className={chip}>
            {c.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

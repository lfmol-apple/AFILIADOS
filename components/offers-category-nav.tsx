import Link from "next/link";
import type { CategoryCount } from "@/lib/queries/offers-feed";

/**
 * Category filter for /ofertas: a vertical column beside the grid on wide
 * screens, a horizontally scrollable chip row on narrow ones (a vertical
 * column would push the offers below the fold on a phone). Plain links
 * (?categoria=slug), so it works without JS and every filter is shareable.
 */
export function OffersCategoryNav({
  categories,
  active,
  total,
}: {
  categories: CategoryCount[];
  active: string | null;
  total: number;
}) {
  const items = [
    { slug: null as string | null, label: "Todas", count: total },
    ...categories.map((c) => ({
      slug: c.slug as string | null,
      label: c.label,
      count: c.count,
    })),
  ];

  return (
    <nav aria-label="Categorias" className="lg:sticky lg:top-20 lg:self-start">
      <h2 className="text-foreground/50 mb-2 hidden text-xs font-semibold tracking-wide uppercase lg:block">
        Categorias
      </h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((item) => {
          const isActive = item.slug === active;
          return (
            <li key={item.slug ?? "todas"} className="shrink-0">
              <Link
                href={
                  item.slug ? `/ofertas?categoria=${item.slug}` : "/ofertas"
                }
                aria-current={isActive ? "page" : undefined}
                scroll={false}
                className={`flex items-center justify-between gap-3 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition lg:rounded-lg lg:py-2 ${
                  isActive
                    ? "bg-brand text-brand-foreground font-semibold"
                    : "border-border-subtle hover:border-brand lg:hover:bg-surface-muted border lg:border-transparent"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-xs tabular-nums ${isActive ? "opacity-80" : "text-foreground/40"}`}
                >
                  {item.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

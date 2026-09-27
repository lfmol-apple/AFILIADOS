import Link from "next/link";
import { CategoryScroller } from "@/components/category-scroller";
import { CategorySheet } from "@/components/category-sheet";
import type { CategoryCount } from "@/lib/queries/offers-feed";
import { offersHref, type OffersView } from "@/lib/offers/view";

/** One accent dot per category so the list scans by color as well as by
 * label. Spelled out in full so Tailwind can see every class. */
const DOT: Record<string, string> = {
  "esporte-suplementos": "bg-emerald-500",
  celulares: "bg-indigo-500",
  "audio-games": "bg-blue-600",
  informatica: "bg-violet-500",
  eletrodomesticos: "bg-sky-500",
  casa: "bg-orange-500",
  limpeza: "bg-cyan-500",
  beleza: "bg-rose-500",
  bebe: "bg-pink-400",
  pet: "bg-amber-500",
  ferramentas: "bg-stone-500",
  moda: "bg-fuchsia-500",
  outros: "bg-zinc-400",
};

/**
 * Category filter for /ofertas. Wide screens: a glass card beside the grid
 * that is never taller than the screen — the list scrolls inside it, so the
 * last categories stay reachable on a laptop. Phones: a glass bar stuck under
 * the header while the offers scroll, with the chips (edges faded, the active
 * one centered) and a button that opens every category as a grid. Plain links
 * (?categoria=slug), so it works without JS and every filter is shareable.
 */
export function OffersCategoryNav({
  categories,
  view,
  total,
}: {
  categories: CategoryCount[];
  view: OffersView;
  total: number;
}) {
  const active = view.category;
  const items = [
    { slug: null as string | null, label: "Todas", count: total },
    ...categories.map((c) => ({
      slug: c.slug as string | null,
      label: c.label,
      count: c.count,
    })),
  ];

  return (
    <nav
      aria-label="Categorias"
      className="sticky top-[3.4rem] z-30 -mx-4 sm:-mx-6 lg:top-[5.25rem] lg:mx-0 lg:self-start"
    >
      <div className="glass-nav flex items-center gap-2 px-4 py-2 sm:px-6 lg:max-h-[calc(100dvh-7.5rem)] lg:flex-col lg:items-stretch lg:gap-0 lg:rounded-2xl lg:p-3">
        <CategorySheet
          items={items.map((item) => ({
            key: item.slug ?? "todas",
            label: item.label,
            count: item.count,
            href: offersHref(view, { category: item.slug }),
            active: item.slug === active,
            dot: DOT[item.slug ?? ""] ?? "bg-teal-500",
          }))}
        />
        <h2 className="text-foreground/50 hidden px-2 pt-1 pb-2 text-xs font-bold tracking-wide uppercase lg:block">
          Categorias
        </h2>
        <CategoryScroller
          activeKey={active ?? "todas"}
          className="relative flex min-w-0 flex-1 [scrollbar-width:none] gap-2 overflow-x-auto [mask-image:linear-gradient(90deg,transparent,#000_10px,#000_calc(100%-28px),transparent)] lg:min-h-0 lg:[scrollbar-width:thin] lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:overflow-y-auto lg:[mask-image:linear-gradient(180deg,#000_calc(100%-28px),transparent)] lg:pr-1 lg:pb-7"
        >
          {items.map((item) => {
            const isActive = item.slug === active;
            return (
              <li key={item.slug ?? "todas"} className="shrink-0">
                <Link
                  href={offersHref(view, { category: item.slug })}
                  aria-current={isActive ? "page" : undefined}
                  scroll={false}
                  className={`flex min-h-11 items-center gap-2.5 rounded-full px-3.5 text-sm whitespace-nowrap transition lg:min-h-10 lg:rounded-xl lg:whitespace-normal ${
                    isActive
                      ? "bg-brand text-brand-foreground font-semibold shadow-sm"
                      : "border-border-subtle bg-background/70 hover:border-brand/50 lg:hover:bg-foreground/5 border lg:border-transparent lg:bg-transparent"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isActive
                        ? "bg-brand-foreground"
                        : (DOT[item.slug ?? ""] ?? "bg-teal-500")
                    }`}
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    {item.label}
                  </span>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${isActive ? "opacity-80" : "text-foreground/40"}`}
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </CategoryScroller>
      </div>
    </nav>
  );
}

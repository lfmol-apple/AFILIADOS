import Link from "next/link";
import type { CategoryCount } from "@/lib/queries/offers-feed";

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
 * Category filter for /ofertas: a vertical card beside the grid on wide
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
    <nav aria-label="Categorias" className="lg:sticky lg:top-24 lg:self-start">
      <div className="lg:border-border-subtle lg:bg-background lg:rounded-2xl lg:border lg:p-3 lg:shadow-sm">
        <h2 className="text-foreground/50 hidden px-2 pt-1 pb-2 text-xs font-bold tracking-wide uppercase lg:block">
          Categorias
        </h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
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
                  className={`flex min-h-11 items-center gap-2.5 rounded-full px-3.5 text-sm whitespace-nowrap transition lg:min-h-10 lg:rounded-xl lg:whitespace-normal ${
                    isActive
                      ? "bg-brand text-brand-foreground font-semibold shadow-sm"
                      : "border-border-subtle bg-background hover:border-brand/50 lg:hover:bg-surface-muted border lg:border-transparent"
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
        </ul>
      </div>
    </nav>
  );
}

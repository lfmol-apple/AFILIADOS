import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import type { RadarFeedItem } from "@/lib/queries/radar-events";

/**
 * Radar on the Home page, take 2 (2026-09-08) — "Radar é inteligência, não
 * catálogo" (project brief). The original components/radar-feed.tsx
 * renders full product cards (image, price, CTA button) — exactly the
 * "looks like another vitrine" problem this rewrite exists to fix.
 * radar-feed.tsx is kept as-is (untouched, still used nowhere else, kept
 * for a future "ver todos os eventos" surface if one is ever built) —
 * this is a deliberately separate, compact rendering: a few text lines,
 * no image, no card chrome, so a visitor can't mistake it for a shopping
 * grid. Every headline is still `item.event.headline` — a pure function
 * of real evidence (lib/services/radar.ts), never invented here.
 */
export function RadarSummary({ items }: { items: RadarFeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="text-foreground/70 text-sm font-semibold tracking-wide uppercase">
        👁 O PreçoCaindo está observando o mercado
      </h2>
      {items.some((item) => item.ctaHref) && (
        <div className="mt-2">
          <AffiliateDisclosure />
        </div>
      )}
      <ul className="border-border-subtle divide-border-subtle mt-3 divide-y rounded-lg border">
        {items.map((item, i) => (
          <li key={`${item.event.merchantListingId}-${item.event.type}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{item.title}</span>
              <span className="text-foreground/60"> — {item.event.headline}</span>
            </span>
            {item.ctaHref && (
              <a
                href={item.ctaHref}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className="text-brand shrink-0 text-xs font-medium whitespace-nowrap hover:underline"
              >
                Ver →
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

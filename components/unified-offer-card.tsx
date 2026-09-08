import type { UnifiedOfferCard as UnifiedOfferCardData } from "@/lib/queries/unified-offers";

/**
 * ONE card shape for every merchant — project brief, 2026-09-08:
 * "não separar Achados Shopee / Achados Mercado Livre / Achados Amazon".
 * Marketplace is a small secondary label, never the headline (same rule
 * already established for the Radar — components/radar-feed.tsx).
 * Server Component, no "use client" (see that file's hydration-incident
 * comment — still applies to any card touching AffiliateDisclosure's
 * import chain via a parent).
 */
const MERCHANT_LABEL: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  MERCADO_LIVRE: "Mercado Livre",
};

export function UnifiedOfferCard({ item }: { item: UnifiedOfferCardData }) {
  if (!item.href) return null; // structural safety net — see the type's own doc comment.

  return (
    <a
      href={item.href}
      target={item.merchant === "AMAZON" ? undefined : "_blank"}
      rel={item.merchant === "AMAZON" ? undefined : "sponsored nofollow noopener noreferrer"}
      className="group border-border-subtle bg-background flex h-full flex-col overflow-hidden rounded-xl border transition hover:shadow-md"
    >
      <div className="bg-surface-muted aspect-square w-full overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">{item.title}</h3>
        <div className="mt-auto pt-1">
          {item.currentPrice !== null ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-lg font-semibold">
                {item.currentPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {item.referencePrice !== null && (
                <span className="text-foreground/40 text-xs line-through">
                  {item.referencePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              )}
              {item.discountPercent !== null && item.discountPercent > 0 && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  −{Math.round(item.discountPercent * 100)}%
                </span>
              )}
            </div>
          ) : null}
          <div className="text-foreground/60 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {item.rating !== null && <span>★ {item.rating.toFixed(1)}</span>}
            {item.soldQuantity !== null && <span>{item.soldQuantity} vendidos</span>}
          </div>
          <span className="text-foreground/50 mt-2 block text-xs">
            {MERCHANT_LABEL[item.merchant]}
          </span>
        </div>
      </div>
    </a>
  );
}

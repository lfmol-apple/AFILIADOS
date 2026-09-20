import type { UnifiedOfferCard as UnifiedOfferCardData } from "@/lib/queries/unified-offers";

/**
 * ONE card shape for every merchant — project brief, 2026-09-08:
 * "não separar Achados Shopee / Achados Mercado Livre / Achados Amazon".
 * Marketplace is a small color-coded badge, never the headline (same rule
 * already established for the Radar — components/radar-feed.tsx).
 * Server Component, no "use client" (see that file's hydration-incident
 * comment — still applies to any card touching AffiliateDisclosure's
 * import chain via a parent).
 *
 * Layout rules that keep a grid of these aligned: the photo box is a fixed
 * square on white with object-contain (marketplace photos come in every
 * shape; cropping made some look broken), and the bottom block has fixed
 * price and meta rows, so prices line up across a row even when one card has
 * no rating or sales figure.
 */
const MERCHANT_LABEL: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  MERCADO_LIVRE: "Mercado Livre",
};

const MERCHANT_BADGE: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "bg-slate-900 text-white",
  SHOPEE: "border border-orange-200 bg-orange-50 text-orange-800",
  MERCADO_LIVRE: "border border-yellow-300 bg-yellow-100 text-yellow-900",
};

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function UnifiedOfferCard({ item }: { item: UnifiedOfferCardData }) {
  if (!item.href) return null; // structural safety net — see the type's own doc comment.

  const discount =
    item.discountPercent !== null && item.discountPercent > 0
      ? Math.round(item.discountPercent * 100)
      : null;
  const meta = [
    item.rating !== null ? `★ ${item.rating.toFixed(1)}` : null,
    item.soldQuantity !== null
      ? `${item.soldQuantity.toLocaleString("pt-BR")} vendidos`
      : null,
  ].filter(Boolean);

  return (
    <div className="group border-border-subtle bg-background hover:border-brand/50 relative flex h-full flex-col overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <a
        href={item.href}
        target={item.merchant === "AMAZON" ? undefined : "_blank"}
        rel={
          item.merchant === "AMAZON"
            ? undefined
            : "sponsored nofollow noopener noreferrer"
        }
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-4"
            />
          ) : null}
          {discount !== null && (
            <span className="absolute top-2 left-2 rounded-full bg-rose-600 px-2.5 py-1 text-xs leading-none font-bold text-white shadow">
              −{discount}%
            </span>
          )}
          <span
            className={`absolute top-2 right-2 rounded-full px-2 py-1 text-[11px] leading-none font-semibold ${MERCHANT_BADGE[item.merchant]}`}
          >
            {MERCHANT_LABEL[item.merchant]}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug font-medium">
            {item.title}
          </h3>

          <div className="mt-auto pt-3">
            <div className="flex min-h-8 flex-wrap items-baseline gap-x-2">
              {item.currentPrice !== null ? (
                <>
                  <span className="text-xl leading-none font-bold tracking-tight sm:text-2xl">
                    {brl(item.currentPrice)}
                  </span>
                  {item.referencePrice !== null && (
                    <span className="text-foreground/40 text-xs line-through">
                      {brl(item.referencePrice)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-foreground/50 text-sm">
                  Ver preço na loja
                </span>
              )}
            </div>
            <p className="text-foreground/60 mt-1 min-h-5 text-xs">
              {meta.join(" · ")}
            </p>

            <span className="bg-brand text-brand-foreground mt-3 flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition group-hover:bg-teal-800 dark:group-hover:bg-teal-300">
              Ver oferta
            </span>
          </div>
        </div>
      </a>
      {item.detailHref && (
        <a
          href={item.detailHref}
          className="text-brand border-border-subtle hover:bg-surface-muted border-t px-4 py-2.5 text-center text-xs font-medium"
        >
          Ver detalhes →
        </a>
      )}
    </div>
  );
}

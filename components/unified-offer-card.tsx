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

/** Store badge: a small frosted-glass pill over the photo, the store told by
 * a colored dot. Kept dark-on-light in both themes because the photo box is
 * always white. */
const MERCHANT_DOT: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "bg-slate-800",
  SHOPEE: "bg-orange-500",
  MERCADO_LIVRE: "bg-yellow-400",
};

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function UnifiedOfferCard({ item }: { item: UnifiedOfferCardData }) {
  if (!item.href) return null; // structural safety net — see the type's own doc comment.

  const discount =
    item.discountPercent !== null && item.discountPercent > 0
      ? Math.round(item.discountPercent * 100)
      : null;
  const saving =
    item.currentPrice !== null &&
    item.referencePrice !== null &&
    item.referencePrice > item.currentPrice
      ? item.referencePrice - item.currentPrice
      : null;
  const meta = [
    item.rating !== null ? `★ ${item.rating.toFixed(1)}` : null,
    item.soldQuantity !== null
      ? `${item.soldQuantity.toLocaleString("pt-BR")} vendidos`
      : null,
  ].filter(Boolean);

  return (
    <div className="group border-border-subtle bg-background hover:border-brand/40 relative flex h-full flex-col overflow-hidden rounded-3xl border shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(15_118_110/0.5)]">
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
            <span className="absolute top-2.5 left-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs leading-none font-bold text-white shadow-md shadow-rose-600/30">
              −{discount}%
            </span>
          )}
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-2 py-1 text-[11px] leading-none font-semibold text-slate-800 shadow-sm backdrop-blur-md">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${MERCHANT_DOT[item.merchant]}`}
            />
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
                <span className="bg-foreground/5 text-foreground/70 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium">
                  Preço na loja
                </span>
              )}
            </div>
            <p className="text-foreground/60 mt-1 min-h-5 text-xs">
              {saving !== null && (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Economize {brl(saving)}
                </span>
              )}
              {saving !== null && meta.length > 0 && " · "}
              {meta.join(" · ")}
            </p>

            <span className="bg-brand text-brand-foreground mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition group-hover:bg-teal-800 dark:group-hover:bg-teal-300">
              {item.currentPrice !== null ? "Ver oferta" : "Ver preço"}
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </a>
      {item.detailHref && (
        <a
          href={item.detailHref}
          className="text-brand border-border-subtle/60 hover:bg-brand/8 border-t px-4 py-2.5 text-center text-xs font-medium"
        >
          Ver detalhes →
        </a>
      )}
    </div>
  );
}

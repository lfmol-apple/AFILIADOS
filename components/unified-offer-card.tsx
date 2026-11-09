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

/** The main CTA names the actual store ("Ver na Shopee") instead of a
 * generic "Ver oferta" — owner's request, 2026-11-09: with a second,
 * equally real button for Amazon now sitting right next to it, "ver
 * oferta" stopped saying which of the two it meant. */
const CTA_STORE_LABEL: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "Ver na Amazon",
  SHOPEE: "Ver na Shopee",
  MERCADO_LIVRE: "Ver no Mercado Livre",
};

/** Each store's own brand color on its button, not one generic brand-teal
 * for all three — owner's request, 2026-11-09, same reasoning as the label
 * above. Amazon's own CTA reuses the dark pill the secondary Amazon button
 * already uses elsewhere on the card, so the color always means the same
 * store everywhere it appears. */
const CTA_STORE_STYLE: Record<UnifiedOfferCardData["merchant"], string> = {
  AMAZON: "bg-slate-900 text-white hover:bg-slate-800",
  SHOPEE: "bg-[#EE4D2D] text-white hover:bg-[#D8431F]",
  MERCADO_LIVRE: "bg-[#FFE600] text-slate-900 hover:bg-[#FFD400]",
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

/** A small inline approximation of the Amazon wordmark (dark pill, "amazon"
 * in lowercase, orange smile-arrow underneath) — never a copied logo asset
 * file, just a vector shape evocative enough to read as "Amazon" at a
 * glance. Used only on the secondary cross-merchant CTA below. */
function AmazonMark() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[13px] font-semibold tracking-tight text-white">
        amazon
      </span>
      <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden className="-mt-1">
        <path
          d="M1 1.5C4 4.5 11 5.5 15 1.5"
          stroke="#FF9900"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M13 0.8L15.3 1.3L14 3.2Z" fill="#FF9900" />
      </svg>
    </span>
  );
}

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

  const target = item.merchant === "AMAZON" ? undefined : "_blank";
  const rel =
    item.merchant === "AMAZON"
      ? undefined
      : "sponsored nofollow noopener noreferrer";

  return (
    <div className="group border-border-subtle bg-background hover:border-brand/40 relative flex h-full flex-col overflow-hidden rounded-3xl border shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(15_118_110/0.5)]">
      {/* Image box: the merchant link covers just the photo here (not an
          ancestor of the Amazon badge below), so the two never nest. */}
      <div className="relative aspect-square w-full overflow-hidden bg-white">
        <a href={item.href} target={target} rel={rel} className="absolute inset-0 block">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-4"
            />
          ) : null}
        </a>
        {discount !== null && (
          <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs leading-none font-bold text-white shadow-md shadow-rose-600/30">
            −{discount}%
          </span>
        )}
        <span className="pointer-events-none absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-2 py-1 text-[11px] leading-none font-semibold text-slate-800 shadow-sm backdrop-blur-md">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${MERCHANT_DOT[item.merchant]}`}
          />
          {MERCHANT_LABEL[item.merchant]}
        </span>
        {item.amazonMatch && (
          <a
            href={item.amazonMatch.href}
            className="absolute bottom-2.5 left-2.5 z-10 flex items-center rounded-full bg-slate-900 px-2.5 py-1 shadow-md shadow-black/30 transition hover:bg-slate-800"
            aria-label="Ver preço na Amazon"
          >
            <AmazonMark />
          </a>
        )}
      </div>

      <a href={item.href} target={target} rel={rel} className="flex flex-1 flex-col p-3 sm:p-4">
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

          <span
            className={`${CTA_STORE_STYLE[item.merchant]} mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] transition`}
          >
            {item.currentPrice !== null
              ? CTA_STORE_LABEL[item.merchant]
              : "Ver preço"}
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </a>
      {item.amazonMatch && (
        <a
          href={item.amazonMatch.href}
          className="mx-3 mb-3 flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] transition hover:bg-slate-800 sm:mx-4 sm:mb-4"
        >
          Ver preço na <AmazonMark />
        </a>
      )}
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

import Link from "next/link";
import { offersHref, STORE_OPTIONS, type OffersView } from "@/lib/offers/view";

/** Each store's own brand color — same tokens as the CTA buttons on
 * unified-offer-card.tsx, so a store always means the same color
 * everywhere on the site. */
const STORE_STYLE: Record<(typeof STORE_OPTIONS)[number]["merchant"], string> = {
  MERCADO_LIVRE: "bg-[#FFE600] text-slate-900 hover:bg-[#FFD400] border-transparent",
  SHOPEE: "bg-[#EE4D2D] text-white hover:bg-[#D8431F] border-transparent",
  AMAZON: "bg-slate-900 text-white hover:bg-slate-800 border-transparent",
};

function MercadoLivreMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
      <circle cx="12" cy="12" r="10" fill="#2D3277" />
      <path d="M6.5 13.5c1.5 2 3.5 2 5.5 2s4-0 5.5-2" stroke="#FFE600" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShopeeMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
        fill="white"
        stroke="white"
        strokeWidth="1.4"
      />
      <path d="M9 9a3 3 0 0 1 6 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AmazonSmile() {
  return (
    <svg width="18" height="9" viewBox="0 0 18 9" aria-hidden className="-mt-0.5">
      <path d="M1 1.5C4.5 4.8 12 5.8 16.5 1.5" stroke="#FF9900" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M14.5 0.7L17 1.3L15.5 3.3Z" fill="#FF9900" />
    </svg>
  );
}

const STORE_MARK: Record<(typeof STORE_OPTIONS)[number]["merchant"], React.ReactNode> = {
  MERCADO_LIVRE: <MercadoLivreMark />,
  SHOPEE: <ShopeeMark />,
  AMAZON: null, // Amazon's wordmark already reads as a logo on its own — see below.
};

/**
 * Owner's request, 2026-11-27: the store filter, promoted out of the
 * toolbar (where it read as a plain gray chip among "Ordenar") into its
 * own centered row right below the teal /ofertas header, each store in
 * its real brand color with a small mark — so picking a store feels like
 * picking a store, not a generic filter. Same `offersHref`/`view.store`
 * plumbing as before; only the presentation and position changed.
 */
export function StoreBrandBar({
  view,
  stores,
}: {
  view: OffersView;
  /** Stores that actually have offers right now — never offer an empty filter. */
  stores: string[];
}) {
  const available = STORE_OPTIONS.filter((s) => stores.includes(s.merchant));
  if (available.length <= 1) return null;

  return (
    <div className="-mt-3 mb-3 flex flex-wrap items-center justify-center gap-2 sm:-mt-4 sm:mb-5">
      <Link
        href={offersHref(view, { store: null })}
        scroll={false}
        aria-current={view.store === null ? "true" : undefined}
        className={`flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
          view.store === null
            ? "border-brand bg-brand/10 text-brand"
            : "border-border-subtle bg-background hover:border-brand/50"
        }`}
      >
        Todas
      </Link>
      {available.map((s) => {
        const active = view.store === s.slug;
        return (
          <Link
            key={s.slug}
            href={offersHref(view, { store: s.slug })}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold shadow-sm transition ${STORE_STYLE[s.merchant]} ${active ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
          >
            {STORE_MARK[s.merchant]}
            {s.merchant === "AMAZON" ? (
              <span className="inline-flex items-center gap-1">
                amazon
                <AmazonSmile />
              </span>
            ) : (
              s.label
            )}
          </Link>
        );
      })}
    </div>
  );
}

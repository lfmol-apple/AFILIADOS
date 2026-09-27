/**
 * One line icon per /ofertas category (slug from lib/offers/categories.ts),
 * plus "todas". Drawn on a 24px grid with a shared 1.6 stroke so the whole
 * set reads as one family; color comes from the parent (currentColor).
 * Server-safe: no hooks, no state.
 */
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, React.ReactNode> = {
  todas: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" {...P} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" {...P} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" {...P} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" {...P} />
    </>
  ),
  "esporte-suplementos": (
    <path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11" {...P} />
  ),
  celulares: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.4" {...P} />
      <path d="M10.8 18.5h2.4" {...P} />
    </>
  ),
  "audio-games": (
    <>
      <path
        d="M7 8h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.2 2L14.5 14h-5l-1.3 1.5A3 3 0 0 1 3 13.5V12a4 4 0 0 1 4-4Z"
        {...P}
      />
      <path d="M8 10.5v3M6.5 12h3M15.5 11.2h.01M17.6 12.8h.01" {...P} />
    </>
  ),
  informatica: (
    <>
      <rect x="4" y="5" width="16" height="11" rx="1.8" {...P} />
      <path d="M2.5 19.5h19" {...P} />
    </>
  ),
  eletrodomesticos: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="2.2" {...P} />
      <circle cx="12" cy="13.5" r="4" {...P} />
      <path d="M8 6.5h.01M11 6.5h.01" {...P} />
    </>
  ),
  casa: (
    <>
      <path d="M4.5 11.5 12 4.5l7.5 7M6.5 10v9.5h11V10" {...P} />
      <path d="M10 19.5v-5h4v5" {...P} />
    </>
  ),
  limpeza: (
    <>
      <path
        d="m11 3.5 1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7L11 3.5Z"
        {...P}
      />
      <path d="m18 14.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" {...P} />
    </>
  ),
  beleza: (
    <path d="M12 3.5c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5.5 5-9Z" {...P} />
  ),
  bebe: (
    <>
      <path d="M9.5 3.5h5l.8 3h-6.6l.8-3Z" {...P} />
      <path
        d="M8.5 6.5h7l-.7 12a1.6 1.6 0 0 1-1.6 1.5h-2.4a1.6 1.6 0 0 1-1.6-1.5l-.7-12Z"
        {...P}
      />
      <path d="M9.4 11.5h5.2" {...P} />
    </>
  ),
  pet: (
    <>
      <path
        d="M6.5 10.5h.01M10 6.5h.01M14 6.5h.01M17.5 10.5h.01"
        {...P}
        strokeWidth={3.4}
      />
      <path
        d="M12 12.5c-3 0-5 2.5-5 4.5 0 1.6 1.4 2.5 3 2.5.8 0 1.4-.3 2-.3s1.2.3 2 .3c1.6 0 3-.9 3-2.5 0-2-2-4.5-5-4.5Z"
        {...P}
      />
    </>
  ),
  ferramentas: (
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77Z"
      {...P}
    />
  ),
  moda: (
    <path
      d="M8.5 4 4 6.5l1.8 4 2.2-1V20h8V9.5l2.2 1 1.8-4L15.5 4c-.5 1.3-1.9 2-3.5 2s-3-.7-3.5-2Z"
      {...P}
    />
  ),
  automotivo: (
    <>
      <path
        d="M4.5 17v-4.5l1.8-4.4a2 2 0 0 1 1.9-1.3h7.6a2 2 0 0 1 1.9 1.3l1.8 4.4V17h-15Z"
        {...P}
      />
      <path d="M4.5 12.5h15M7.5 15h.01M16.5 15h.01M6.5 17v2M17.5 17v2" {...P} />
    </>
  ),
  alimentos: (
    <>
      <path
        d="M5 9.5h11V14a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14V9.5Z"
        {...P}
      />
      <path d="M16 11h1.4a2 2 0 0 1 0 4H16M8 4.5v2M11.5 4.5v2" {...P} />
    </>
  ),
  musica: (
    <>
      <path d="M9 17.5V6l10-2v11.5" {...P} />
      <circle cx="6.5" cy="17.5" r="2.5" {...P} />
      <circle cx="16.5" cy="15.5" r="2.5" {...P} />
    </>
  ),
  "brinquedos-festas": (
    <>
      <path d="M4.5 10h15v10h-15zM3.5 7h17v3h-17zM12 7v13" {...P} />
      <path
        d="M12 7c-1.4-3.4-4.6-3-4.2-.7.3 1.4 2.3 1 4.2.7ZM12 7c1.4-3.4 4.6-3 4.2-.7-.3 1.4-2.3 1-4.2.7Z"
        {...P}
      />
    </>
  ),
  outros: (
    <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" {...P} strokeWidth={3.2} />
  ),
};

export function OfferCategoryIcon({
  slug,
  className = "h-4 w-4",
}: {
  slug: string | null;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {ICONS[slug ?? "todas"] ?? ICONS.outros}
    </svg>
  );
}

/** The rounded tile the icon sits on in lists. Active = on a brand fill. */
export function OfferCategoryTile({
  slug,
  active = false,
  size = "sm",
}: {
  slug: string | null;
  active?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${
        size === "md" ? "h-11 w-11 rounded-xl" : "h-8 w-8 rounded-lg"
      } ${active ? "bg-brand-foreground/15" : "bg-brand/10 text-brand"}`}
    >
      <OfferCategoryIcon
        slug={slug}
        className={size === "md" ? "h-6 w-6" : "h-5 w-5"}
      />
    </span>
  );
}

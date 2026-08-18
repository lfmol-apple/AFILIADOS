/**
 * Small, deliberate icon set used only as a placeholder when a product has
 * no real image (or its image fails to load) — never meant to resemble a
 * real product photo. Matched by keyword against the category name so it
 * degrades gracefully for a category outside the current seed too.
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function CategoryIcon({
  categoryName,
  className = "h-10 w-10",
}: {
  categoryName?: string | null;
  className?: string;
}) {
  const key = categoryName ? normalize(categoryName) : "";

  if (key.includes("eletron") || key.includes("informat") || key.includes("tecnolog")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("casa") || key.includes("cozinha")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M5 11.5 12 5l7 6.5M6.5 10v9h11v-9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 19v-4.5h4V19" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (key.includes("beleza") || key.includes("cuidado")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M12 3v6M12 3c-2 1.5-3 3.5-3 6a3 3 0 0 0 6 0c0-2.5-1-4.5-3-6Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 15v6M9 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("esporte") || key.includes("fitness")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="7" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (key.includes("bebe") || key.includes("infantil") || key.includes("crianca")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M9 3.5h4l1 3.5h-6l1-3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 7h8l-.7 11a1.5 1.5 0 0 1-1.5 1.4h-3.6A1.5 1.5 0 0 1 8.7 18L8 7Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 11.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Generic fallback: shopping bag — no category matched.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.5 8h11l1 12.5H5.5L6.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

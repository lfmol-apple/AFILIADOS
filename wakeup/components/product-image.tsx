"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";

/**
 * Robust image with a deliberate placeholder fallback — never lets the
 * browser's broken-image icon show. Today every mock product's imageUrl
 * points at a fictional host (images.example.com) that never resolves, so
 * this always renders the placeholder in dev; once a real provider
 * supplies real, allowed image URLs, those load through the same `<img>`
 * path with no change needed here.
 *
 * A client component only because onError requires it — everything else
 * about the product/category pages stays a Server Component.
 *
 * The browser starts fetching an `<img>` as soon as it parses the
 * server-rendered HTML, before React hydrates and attaches the onError
 * handler — `error` doesn't bubble, so if the image fails fast (a cached
 * DNS failure resolves almost instantly), the event can fire and be
 * missed before hydration completes, leaving the broken-image glyph on
 * screen despite the handler. The mount-time check below is the standard
 * fix: `complete && naturalWidth === 0` after mount means it already
 * failed before we were listening, so treat that the same as onError.
 */
export function ProductImage({
  src,
  alt,
  categoryName,
  className = "",
  iconClassName = "h-12 w-12",
}: {
  src: string | null | undefined;
  alt: string;
  categoryName?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`bg-surface-muted text-brand/40 flex h-full w-full flex-col items-center justify-center gap-2 ${className}`}
      >
        <CategoryIcon categoryName={categoryName} className={iconClassName} />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external/mock product image, not from an allow-listed remote host
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

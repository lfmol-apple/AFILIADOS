"use client";

import type { ReactNode, AnchorHTMLAttributes } from "react";
import { trackAffiliateOutboundClick, trackAddToCart, type VitrineProductIdentity } from "@/lib/analytics/meta-pixel-client";

/**
 * Owner's authorization, 2026-11-22 ("Frente B — Pixel Meta do
 * Henrique"). A thin client wrapper around the EXACT same outbound `<a>`
 * — same `href`, same attributes — that only adds a synchronous,
 * non-blocking `fbq('trackCustom', 'AffiliateOutboundClick', ...)` call
 * on click. Never calls preventDefault, never delays navigation (the
 * fbq call is synchronous and fire-and-forget — the browser's own
 * default link navigation proceeds immediately after), never forces a
 * new tab, never appends anything to the href. If the pixel is blocked,
 * absent, or consent was denied, trackAffiliateOutboundClick is already
 * a silent no-op (lib/analytics/meta-pixel-client.ts) — the link always
 * works exactly as it did before this wrapper existed.
 *
 * Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA VITRINE
 * PRECOCAINDO", item 4): the standard `AddToCart` event now also fires
 * on this same click, alongside the custom one above — see
 * trackAddToCart's own doc comment for why it stays a second, separate
 * call rather than replacing the custom event.
 */
export function AffiliateOutboundLink({
  product,
  children,
  onClick,
  ...anchorProps
}: {
  product: VitrineProductIdentity;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...anchorProps}
      onClick={(e) => {
        trackAffiliateOutboundClick(product);
        trackAddToCart(product);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

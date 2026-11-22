"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { readCachedConsent, CONSENT_CHANGED_EVENT } from "@/lib/privacy/consent-client";

/**
 * Meta Pixel loader (owner's authorization, 2026-11-22, "Frente B —
 * Pixel Meta do Henrique"). Mounted ONCE in app/layout.tsx. Loads the
 * official Meta Pixel base code only when:
 *   1. `pixelId` is a real, non-empty value (env.META_PIXEL_ID — never
 *      invented here; see lib/config/env.ts's own doc comment), AND
 *   2. The visitor has GRANTED marketing consent.
 *
 * If either is false, nothing loads — no script tag, no fbq global, no
 * network request. Reacts live to a consent change (CONSENT_CHANGED_EVENT)
 * so accepting the banner loads the pixel immediately, without needing a
 * page reload — same requirement B8 states for "alterar posteriormente a
 * preferência": revoking consent later cannot retroactively un-send
 * already-fired events, but it does stop the pixel loading and stops
 * firing any future ones (checked again by every tracking call site, not
 * just here).
 *
 * `trackPageViewOnNavigation` fires `fbq('track', 'PageView')` on every
 * CLIENT-SIDE route change after the initial load (the base code's own
 * `fbq('init', ...)` call already fires the first PageView — this effect
 * explicitly skips that one, via `isFirstRender`, to avoid a duplicate).
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!pixelId) return;
    const sync = () => setEnabled(readCachedConsent()?.marketing === "GRANTED");
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
  }, [pixelId]);

  useEffect(() => {
    if (!enabled) return;
    if (isFirstRender.current) {
      // The base code below already fires the first PageView on init.
      isFirstRender.current = false;
      return;
    }
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, enabled]);

  if (!pixelId || !enabled) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

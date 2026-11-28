"use client";

import { readCachedConsent } from "@/lib/privacy/consent-client";

/**
 * Meta Pixel event helpers (owner's authorization, 2026-11-22, "Frente B
 * — Pixel Meta do Henrique"). Every function here is consent-gated and a
 * silent no-op when the pixel isn't loaded — never throws, never blocks
 * navigation, never retries. `content_ids` MUST be the same
 * merchantListingId the catalog feed uses as `g:id`
 * (app/catalogo/mercado-livre.xml/route.ts) — confirmed by reading that
 * route directly, not assumed.
 */
export interface VitrineProductIdentity {
  /** Real VitrineSelection.merchantListingId — the exact value the Meta
   * catalog feed publishes as `g:id`. Never the Mercado Livre externalId
   * (MLB...), which the catalog never uses as its own id. */
  merchantListingId: string;
  /** The real product title, as shown on the page — never invented. */
  title: string;
  /** The real current price, as shown on the page — never a stale or
   * placeholder value. Null when genuinely unknown (never guessed; the
   * event is simply not fired in that case). */
  price: number | null;
  /** Owner's directive, 2026-11-26 ("a equipe do Henrique informou que
   * os eventos estão chegando com a URL da home... não falsifique
   * event_source_url... envie a URL canônica do produto como parâmetro
   * adicional, preservando a URL real de origem"). `event_source_url`
   * itself is never set here — fbq.js already derives it honestly from
   * the real browser location at call time, and this project never
   * overrides that. This is a SEPARATE, additional field (`content_url`
   * in the sent payload) so Henrique's team can always see, in Events
   * Manager's raw event data, which exact product the event was about —
   * regardless of which internal route (product page, Vitrine grid, the
   * /go/vitrine/... interstitial) the browser happened to be on when it
   * fired. Absolute URL, real, never fabricated; omitted (not sent) when
   * genuinely unknown — never a guessed value. */
  canonicalUrl?: string | null;
}

function fbqAvailableWithConsent(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function" && readCachedConsent()?.marketing === "GRANTED";
}

/** Owner's directive, 2026-11-22: fire only when a real Vitrine product
 * is genuinely shown prominently (its own page, opened with the
 * vitrine-tracked context) — never for all 30 just because they exist
 * somewhere in the page's HTML. */
export function trackViewContent(product: VitrineProductIdentity): void {
  if (!fbqAvailableWithConsent()) return;
  if (product.price === null) return; // never send a product with an unknown price
  window.fbq!("track", "ViewContent", {
    content_ids: [product.merchantListingId],
    content_name: product.title,
    value: product.price,
    currency: "BRL",
    content_type: "product",
    ...(product.canonicalUrl ? { content_url: product.canonicalUrl } : {}),
  });
}

/** Owner's directive, 2026-11-22, REAFFIRMED 2026-11-25 ("não dispare
 * AddToCart artificialmente, pois o PreçoCaindo não possui carrinho"):
 * a custom event, NEVER the standard AddToCart — this click only
 * forwards the visitor to the real Mercado Livre offer, it never adds
 * anything to a cart that doesn't exist. Never alters the outbound href
 * itself; the caller attaches this purely as a side-effect on click.
 * This is the one and only event this project fires for "the visitor is
 * now leaving toward the merchant" — on product pages (via
 * AffiliateOutboundLink's onClick) AND on the Vitrine interstitial (via
 * lib/services/vitrine-redirect-interstitial.ts) alike, so both surfaces
 * report the same, single, real commercial-intent signal to Meta.
 * Owner's note, 2026-11-25: evaluate registering this as a Custom
 * Conversion in Meta Events Manager — see docs/henrique-pixel-integration.md. */
export function trackAffiliateOutboundClick(product: VitrineProductIdentity): void {
  if (!fbqAvailableWithConsent()) return;
  if (product.price === null) return;
  window.fbq!("trackCustom", "AffiliateOutboundClick", {
    content_ids: [product.merchantListingId],
    content_name: product.title,
    value: product.price,
    currency: "BRL",
    content_type: "product",
    ...(product.canonicalUrl ? { content_url: product.canonicalUrl } : {}),
  });
}

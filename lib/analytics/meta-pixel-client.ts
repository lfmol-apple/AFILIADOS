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
  });
}

/** Owner's directive, 2026-11-22: a custom event, NOT AddToCart —
 * PreçoCaindo has no cart, and this click only forwards the visitor to
 * the real Mercado Livre offer. Never alters the outbound href itself;
 * the caller attaches this purely as a side-effect on click. */
export function trackAffiliateOutboundClick(product: VitrineProductIdentity): void {
  if (!fbqAvailableWithConsent()) return;
  if (product.price === null) return;
  window.fbq!("trackCustom", "AffiliateOutboundClick", {
    content_ids: [product.merchantListingId],
    content_name: product.title,
    value: product.price,
    currency: "BRL",
    content_type: "product",
  });
}

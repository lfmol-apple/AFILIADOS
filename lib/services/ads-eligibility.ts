import { detectPriceDrop } from "@/lib/services/radar";
import { evaluatePublicationGate } from "@/lib/services/publication-gate";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

/**
 * The strictest of the three commercial decisions (owner's brief,
 * 2026-11-17, section 7.C): a listing worth paid traffic, not just worth
 * existing on the site or being posted to WhatsApp. Combines three
 * already-real signals — never a new score, never a conversion
 * prediction:
 *
 *  1. evaluatePublicationGate().indexable — the same editorial bar the
 *     public site already uses. Never reads MonetizationScore (same rule
 *     publication-gate.ts itself follows), so a loja paying more
 *     commission can never buy its way into ad eligibility.
 *  2. The affiliate link was revalidated recently — a stricter freshness
 *     bar than publication-gate's own 30-day one, because money is on
 *     the line here, not just an indexed page.
 *  3. A real, Radar-verified price drop (detectPriceDrop) — the same
 *     evidence the Telegram channel and the new WhatsApp price-drop tier
 *     already require. "Oportunidade comercial" or "preço competitivo"
 *     alone (no real drop) can still earn a site page or a WhatsApp post,
 *     but not a paid ad — ads are the strictest tier by design.
 */
export const MAX_AD_LINK_AGE_MS = 24 * 60 * 60 * 1000;

export interface AdsEligibilityResult {
  eligible: boolean;
  reasons: string[];
  missing: string[];
}

export function evaluateAdsEligibility(
  facts: MerchantListingFacts,
): AdsEligibilityResult {
  const gate = evaluatePublicationGate(facts);
  const missing: string[] = [];
  const reasons: string[] = [];

  if (!gate.indexable) {
    missing.push(...gate.missing);
  } else {
    reasons.push(...gate.reasons);
  }

  const linkFresh =
    facts.affiliateLinkUpdatedAt !== null &&
    Date.now() - facts.affiliateLinkUpdatedAt.getTime() <= MAX_AD_LINK_AGE_MS;
  if (!linkFresh) {
    missing.push("Link afiliado não foi revalidado nas últimas 24h");
  }

  const priceDropEvent = detectPriceDrop(
    facts.merchantListingId,
    facts.priceHistory,
  );
  if (!priceDropEvent) {
    missing.push(
      "Sem queda de preço comprovada — oportunidade comercial sozinha não basta pra anúncio pago",
    );
  } else {
    reasons.push(`Promoção comprovada: ${priceDropEvent.headline}`);
  }

  return {
    eligible: gate.indexable && gate.ctaEligible && linkFresh && priceDropEvent !== null,
    reasons,
    missing,
  };
}

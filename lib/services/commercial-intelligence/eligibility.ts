import { checkAdEligibility } from "@/lib/config/vitrine-ineligible-keywords";

/**
 * Commercial eligibility gate (owner's authorization, 2026-11-19, section
 * 6) — combines real, already-captured signals. Does NOT reuse
 * lib/services/ads-eligibility.ts directly: that function is tied to the
 * site's own AffiliateLinkRegistry (the "precocaindo" tag) and requires
 * that link to be revalidated in the last 24h — a real requirement for
 * the SITE's own paid-media flow, but the wrong dependency for a
 * commercial-intelligence candidate that doesn't have (and shouldn't
 * need) a "precocaindo" link at all. The REQUIRED-price-drop philosophy
 * from that file is deliberately NOT copied here either (section 6:
 * "não torne a queda de preço comprovada uma exigência universal") — a
 * confirmed price drop is scored as a bonus (price-competitiveness.ts),
 * never gates eligibility.
 *
 * "Unknown ≠ favorable" (owner's explicit rule): a missing reputation or
 * condition value is reported as UNKNOWN, which this gate treats as
 * NOT YET eligible for ads (ineligible for the strict "ready for
 * advertising" tier) — but still a valid DISCOVERED/CANDIDATE, since the
 * absence of this one fact isn't itself negative evidence.
 */

export type EligibilityStage = "discovered" | "candidate" | "selected" | "ready_for_ads";

export interface EligibilityResult {
  eligible: boolean;
  blockedReasons: string[];
  /** Facts that are missing, not necessarily disqualifying by themselves
   * but preventing the strictest "ready_for_ads" tier. */
  unknownFacts: string[];
}

/**
 * Mercado Livre's own affiliate program terms (confirmed via the 2026-11-19
 * Meta/ML compliance research): a Special Link only pays commission when
 * it points at a seller with yellow ("4_light_green"/"5_green" in ML's own
 * level_id scale) or green reputation, and the product is new or
 * refurbished — a used item's sale doesn't qualify for commission at all.
 */
const COMMISSION_ELIGIBLE_REPUTATION_LEVELS = new Set(["4_light_green", "5_green"]);
const COMMISSION_ELIGIBLE_CONDITIONS = new Set(["new", "refurbished"]);

export function evaluateCommercialEligibility(input: {
  title: string;
  sellerReputationLevel: string | null;
  condition: string | null;
  hasConfirmedPrice: boolean;
}): EligibilityResult {
  const blockedReasons: string[] = [];
  const unknownFacts: string[] = [];

  const adPolicy = checkAdEligibility(input.title);
  if (!adPolicy.eligible) {
    blockedReasons.push(`Política de anúncio: palavra-chave bloqueada "${adPolicy.matchedKeyword}".`);
  }

  if (!input.hasConfirmedPrice) {
    blockedReasons.push("Sem preço confirmado.");
  }

  if (input.sellerReputationLevel === null) {
    unknownFacts.push("Reputação do vendedor desconhecida.");
  } else if (!COMMISSION_ELIGIBLE_REPUTATION_LEVELS.has(input.sellerReputationLevel)) {
    blockedReasons.push(
      `Vendedor com reputação "${input.sellerReputationLevel}" — o programa de afiliados do Mercado Livre só paga comissão para vendedores com reputação amarela ou verde.`,
    );
  }

  if (input.condition === null) {
    unknownFacts.push("Condição do produto (novo/usado) desconhecida.");
  } else if (!COMMISSION_ELIGIBLE_CONDITIONS.has(input.condition)) {
    blockedReasons.push(
      `Condição "${input.condition}" — o programa de afiliados do Mercado Livre só paga comissão para produtos novos ou recondicionados.`,
    );
  }

  return {
    eligible: blockedReasons.length === 0,
    blockedReasons,
    unknownFacts,
  };
}

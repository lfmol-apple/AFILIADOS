/**
 * Vitrine Inteligente — ad/affiliate eligibility gate (owner's explicit
 * request, 2026-11-19: "verifique a elegibilidade dos produtos para o
 * programa de afiliados e para publicidade na Meta"). Title-based,
 * deliberately conservative: Meta's ad policies restrict or forbid
 * weapons/replicas, militaria, certain supplements, gambling and adult
 * content; a false exclusion (a legitimate product skipped) costs far
 * less than a real policy violation reaching an actual ad or getting the
 * whole catalog/ad account flagged. Found live, 2026-11-19: "Kit
 * Sobrevivência Guepardo", "Lanterna Tática... Sabre De Luz Militar",
 * "Mochila Tática Masculina Militar... Airsoft" were all selected by the
 * previous version of this module — none should have been eligible.
 *
 * Extend this list only by ADDING a real found violation, never by
 * narrowing it to let a specific product back in.
 */
export const VITRINE_INELIGIBLE_KEYWORDS: readonly string[] = [
  "tática",
  "tático",
  "militar",
  "airsoft",
  "sabre de luz",
  "arma de",
  "munição",
  "réplica de arma",
  "soco inglês",
  "taser",
  "spray de pimenta",
  "cassino",
  "aposta esportiva",
  "bet365",
  "apostas online",
  "esteroide",
  "anabolizante",
];

export interface AdEligibilityResult {
  eligible: boolean;
  matchedKeyword: string | null;
}

export function checkAdEligibility(title: string): AdEligibilityResult {
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  for (const keyword of VITRINE_INELIGIBLE_KEYWORDS) {
    const normalizedKeyword = keyword.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (normalized.includes(normalizedKeyword)) {
      return { eligible: false, matchedKeyword: keyword };
    }
  }
  return { eligible: true, matchedKeyword: null };
}

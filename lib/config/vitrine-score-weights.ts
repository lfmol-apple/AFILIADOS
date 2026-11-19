/**
 * Vitrine Inteligente score v2 weights — kept in their own config file, not
 * hardcoded inside the formula (project brief section 7: "permitir que os
 * pesos sejam ajustados sem necessidade de modificar o código"). A missing
 * component's weight is simply excluded and the rest renormalized
 * (lib/services/vitrine-score.ts) — these numbers only need to be
 * consistent with each other, not sum to exactly 1.
 */
export const VITRINE_SCORE_WEIGHTS = {
  demand: 0.2,
  seasonality: 0.2,
  trend: 0.15,
  competitiveness: 0.1,
  quality: 0.15,
  monetization: 0.15,
  adPerformance: 0.05,
} as const;

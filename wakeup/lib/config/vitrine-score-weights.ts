/**
 * Vitrine Inteligente score v3 weights (owner's authorization, 2026-11-19,
 * section 8) — kept in their own config file, never hardcoded inside the
 * formula, so they can be adjusted without touching code and so the
 * Commercial Intelligence Lab (lib/services/commercial-intelligence/lab)
 * can re-run past selections under different weights for sensitivity
 * testing. A missing component's weight is simply excluded and the rest
 * renormalized (lib/services/vitrine-score.ts) — these numbers only need
 * to be consistent with each other, not sum to exactly 1.
 *
 * v3 replaces v2's weights entirely — demand/commission dimensions are
 * no longer the same formulas (v2's saturated far too early; see
 * lib/services/commercial-intelligence/legacy/ for the frozen v2 for
 * comparison in the Lab).
 */
export const VITRINE_SCORE_WEIGHTS = {
  salesEvidence: 0.2,
  commissionValue: 0.2,
  priceCompetitiveness: 0.15,
  quality: 0.15,
  seasonality: 0.15,
  trend: 0.1,
  adPerformance: 0.05,
} as const;

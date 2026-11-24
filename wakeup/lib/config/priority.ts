/**
 * All thresholds ProductPriorityService uses to decide HOT/WARM/COLD.
 * Centralized here so no magic number is duplicated or drifts between the
 * job and its tests — change behavior by editing this file, not by hunting
 * through lib/services/product-priority.ts.
 */
export const PRIORITY_THRESHOLDS = {
  /** A price drop at or above this percentage alone justifies HOT. */
  hotDropPercentage: 15,
  /** Opportunity Score at or above this alone justifies HOT. */
  hotScore: 85,
  /** Recent clicks (within clicksWindowDays) at or above this justify HOT. */
  hotRecentClicks: 5,
  clicksWindowDays: 7,

  /** Below this score, a product doesn't deserve WARM on score alone. */
  warmScore: 55,
  /** A drop at or above this percentage alone justifies WARM. */
  warmDropPercentage: 5,
  warmRecentClicks: 1,

  /** A HOT product with no qualifying signal for this many days is demoted
   * to WARM even if nothing went wrong — HOT is "currently interesting",
   * not "was interesting once". */
  hotStaleAfterDays: 3,
  /** A WARM product with no qualifying signal for this many days is
   * demoted to COLD. */
  warmStaleAfterDays: 14,

  /** OUT_OF_STOCK products are capped at this priority regardless of any
   * other signal — no point refreshing an unavailable listing frequently. */
  outOfStockCap: "WARM",

  /** Minimum time a product must stay at its current priority before it's
   * eligible to change again, to avoid flapping between runs on noisy
   * signals (e.g. a single click). */
  minStabilityHours: 6,
} as const;

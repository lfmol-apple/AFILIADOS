import type { Availability } from "@/types/commerce";
import { PRIORITY_THRESHOLDS as T } from "@/lib/config/priority";

export type Priority = "HOT" | "WARM" | "COLD";

const TIER_RANK: Record<Priority, number> = { COLD: 0, WARM: 1, HOT: 2 };

export interface PrioritySignals {
  currentPriority: Priority;
  priorityUpdatedAt: Date;
  opportunityScore: number | null;
  /** From PriceStats.dropPercentage — positive means price is below its
   * historical baseline. */
  dropPercentage: number | null;
  availability: Availability;
  /** AffiliateClick count within PRIORITY_THRESHOLDS.clicksWindowDays. */
  recentClicks: number;
  now?: Date;
}

export interface PriorityDecision {
  priority: Priority;
  changed: boolean;
  reason: string;
}

function computeTargetTier(signals: PrioritySignals): Priority {
  const score = signals.opportunityScore ?? 0;
  const drop = signals.dropPercentage ?? 0;

  const qualifiesHot =
    score >= T.hotScore || drop >= T.hotDropPercentage || signals.recentClicks >= T.hotRecentClicks;
  const qualifiesWarm =
    score >= T.warmScore || drop >= T.warmDropPercentage || signals.recentClicks >= T.warmRecentClicks;

  let target: Priority = qualifiesHot ? "HOT" : qualifiesWarm ? "WARM" : "COLD";

  // A product nobody can buy right now is never worth refreshing at HOT
  // frequency, no matter how good its price looks.
  if (signals.availability === "OUT_OF_STOCK" && target === "HOT") {
    target = "WARM";
  }

  return target;
}

/**
 * Deterministic HOT/WARM/COLD lifecycle decision — no ML/LLM involved
 * (project brief: "NÃO use IA para determinar prioridade"). Every threshold
 * lives in lib/config/priority.ts, not here, so tuning behavior never means
 * hunting for a magic number.
 *
 * Two guards prevent thrashing on noisy signals:
 * - a minimum stability window before ANY change (minStabilityHours);
 * - a longer staleness window specifically before a DEMOTION
 *   (hotStaleAfterDays/warmStaleAfterDays), so a single quiet day doesn't
 *   drop a HOT product back to WARM.
 *
 * The one exception to both guards: a HOT product that goes OUT_OF_STOCK
 * is demoted immediately (project brief: "Produto OUT_OF_STOCK não deve
 * permanecer indefinidamente HOT" — immediately, not "eventually").
 */
export function decideProductPriority(signals: PrioritySignals): PriorityDecision {
  const now = signals.now ?? new Date();
  const target = computeTargetTier(signals);

  if (target === signals.currentPriority) {
    return { priority: target, changed: false, reason: "signals still support current tier" };
  }

  const hoursSinceUpdate = (now.getTime() - signals.priorityUpdatedAt.getTime()) / (1000 * 60 * 60);
  const daysSinceUpdate = hoursSinceUpdate / 24;

  const isDemotion = TIER_RANK[target] < TIER_RANK[signals.currentPriority];
  const isPromotion = TIER_RANK[target] > TIER_RANK[signals.currentPriority];
  const outOfStockForced = signals.availability === "OUT_OF_STOCK" && signals.currentPriority === "HOT";

  if (!outOfStockForced && hoursSinceUpdate < T.minStabilityHours) {
    return {
      priority: signals.currentPriority,
      changed: false,
      reason: `stability window active (${hoursSinceUpdate.toFixed(1)}h < ${T.minStabilityHours}h)`,
    };
  }

  if (isDemotion && !outOfStockForced) {
    const staleAfterDays = signals.currentPriority === "HOT" ? T.hotStaleAfterDays : T.warmStaleAfterDays;
    if (daysSinceUpdate < staleAfterDays) {
      return {
        priority: signals.currentPriority,
        changed: false,
        reason: `not stale yet (${daysSinceUpdate.toFixed(1)}d < ${staleAfterDays}d)`,
      };
    }
  }

  return {
    priority: target,
    changed: true,
    reason: outOfStockForced ? "out of stock cap" : isPromotion ? "signals justify promotion" : "stale, demoting",
  };
}

import type { Priority } from "./product-priority";

const TIER_ORDER: Record<Priority, number> = { HOT: 0, WARM: 1, COLD: 2 };

export interface RefreshCandidate {
  productId: string;
  priority: Priority;
  lastRefresh: Date;
  /** Set when a previous refresh attempt failed; the candidate is skipped
   * until this passes. Computed by the caller (e.g. from RetryPolicy) —
   * this module doesn't track error state itself. */
  errorBackoffUntil?: Date | null;
}

export interface RefreshPlannerInput {
  candidates: RefreshCandidate[];
  /** Maximum number of products this run is allowed to refresh. This is
   * the only place API call volume is bounded — deliberately NOT a
   * hardcoded per-tier frequency, since we don't know Amazon's real rate
   * limits yet (project brief section 15/54). The caller decides the
   * budget (e.g. from AMAZON_CONTENT_TTL-informed pacing once that's
   * confirmed), and how often this job runs is an external cron decision. */
  rateBudget: number;
  now?: Date;
}

export interface RefreshPlanResult {
  /** Product IDs to refresh this run, in order: HOT before WARM before
   * COLD, and within a tier, the longest-untouched product first. */
  queue: string[];
  skippedBackoff: string[];
}

/**
 * Decides which products get refreshed this run, and in what order,
 * without ever exceeding rateBudget. Priority tier dominates ordering;
 * staleness (time since lastRefresh) breaks ties within a tier. Never
 * attempts to work around a rate limit — a candidate in backoff is simply
 * excluded, not retried harder (project brief: "Nunca tentar burlar rate
 * limit").
 */
export function planRefresh(input: RefreshPlannerInput): RefreshPlanResult {
  const now = input.now ?? new Date();

  const skippedBackoff: string[] = [];
  const eligible = input.candidates.filter((c) => {
    if (c.errorBackoffUntil && c.errorBackoffUntil > now) {
      skippedBackoff.push(c.productId);
      return false;
    }
    return true;
  });

  const sorted = [...eligible].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.priority] - TIER_ORDER[b.priority];
    if (tierDiff !== 0) return tierDiff;
    return a.lastRefresh.getTime() - b.lastRefresh.getTime();
  });

  return {
    queue: sorted
      .slice(0, Math.max(0, input.rateBudget))
      .map((c) => c.productId),
    skippedBackoff,
  };
}

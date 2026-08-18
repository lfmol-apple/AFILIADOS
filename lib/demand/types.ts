import type { DemandIntent } from "@prisma/client";

export type { DemandIntent };

/**
 * One observation of demand for a keyword, from one source. `observedCount`
 * is a real count from that source (search events, catalog matches) —
 * never a fabricated search-volume estimate. A source with no real signal
 * for a keyword simply doesn't emit one; it's DemandEngine's job to decide
 * what a missing/zero observation means (see lib/demand/scoring.ts).
 */
export interface DemandSignal {
  keyword: string;
  intent: DemandIntent;
  source: string;
  productId?: string;
  category?: string;
  observedCount: number;
}

/** A pluggable source of demand signals. Google Search Console / Trends
 * would be future implementations of this interface — not built yet
 * because we don't have that integration (see docs/DEMAND_ENGINE.md). */
export interface DemandSource {
  readonly name: string;
  collect(): Promise<DemandSignal[]>;
}

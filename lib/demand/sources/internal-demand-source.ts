import { prisma } from "@/lib/db";
import type { DemandSignal, DemandSource } from "../types";
import { normalizeKeyword } from "../normalize";

const LOOKBACK_DAYS = 30;

/**
 * Real demand signal from PreçoCaindo's own internal search
 * (project brief Part E: "A busca do PreçoCaindo é também um sinal de
 * demanda"). `observedCount` is the actual number of searches — no
 * external volume estimate involved.
 */
export class InternalDemandSource implements DemandSource {
  readonly name = "internal_search";

  async collect(): Promise<DemandSignal[]> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const rows = await prisma.searchEvent.groupBy({
      by: ["normalizedQuery"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    return rows
      .filter((r) => r.normalizedQuery.length > 0)
      .map((r) => ({
        keyword: r.normalizedQuery,
        intent: "PRODUCT_RESEARCH" as const,
        source: this.name,
        observedCount: r._count._all,
      }));
  }

  /** Searches that consistently return nothing — a signal of unmet demand
   * worth investigating for new catalog coverage, not for content
   * generation on their own (project brief Part E). */
  async collectZeroResultQueries(): Promise<
    { normalizedQuery: string; count: number }[]
  > {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.searchEvent.groupBy({
      by: ["normalizedQuery"],
      where: { createdAt: { gte: since }, resultCount: 0 },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      normalizedQuery: normalizeKeyword(r.normalizedQuery),
      count: r._count._all,
    }));
  }
}

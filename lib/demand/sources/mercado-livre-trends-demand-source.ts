import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { DemandSignal, DemandSource } from "../types";

const API_BASE = "https://api.mercadolibre.com";

/**
 * GET /trends/{site_id}[/{category_id}] — confirmed via
 * developers.mercadolibre.com research on 2026-09-07: returns the 50
 * currently most-searched keywords for the site (or category), updated
 * weekly, as `[{ keyword, url }]` — no numeric search volume, just a
 * ranked list. Requires Authorization: Bearer (empirically confirmed —
 * even /sites returns 403 without one today).
 *
 * `observedCount` here is the array position inverted (rank 1 of 50 -> 50,
 * rank 50 -> 1) — a real signal derived directly from ML's own ranking,
 * never a fabricated search-volume number. This is intentionally NOT
 * wired into lib/demand/index.ts's DEFAULT_SOURCES: doing so would make
 * the existing DemandEngine pipeline throw whenever
 * MERCADO_LIVRE_ACCESS_TOKEN is unset (the default), which is every
 * environment today. A human decides when/if to add this to the default
 * pipeline once a real token exists.
 */
export class MercadoLivreTrendsDemandSource implements DemandSource {
  readonly name = "mercado_livre_trends";

  constructor(private readonly categoryId?: string) {}

  async collect(): Promise<DemandSignal[]> {
    if (
      !env.MERCADO_LIVRE_ENABLED ||
      !env.MERCADO_LIVRE_API_ENABLED ||
      !env.MERCADO_LIVRE_ACCESS_TOKEN
    ) {
      throw new Error(
        "MercadoLivreTrendsDemandSource requires MERCADO_LIVRE_ENABLED, MERCADO_LIVRE_API_ENABLED " +
          "and MERCADO_LIVRE_ACCESS_TOKEN. See docs/MONETIZATION_SCORE.md.",
      );
    }

    const path = this.categoryId
      ? `/trends/${env.MERCADO_LIVRE_SITE_ID}/${this.categoryId}`
      : `/trends/${env.MERCADO_LIVRE_SITE_ID}`;
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${env.MERCADO_LIVRE_ACCESS_TOKEN}` },
    });

    if (!response.ok) {
      logger.error("mercado_livre.trends_failed", { status: response.status });
      throw new Error(
        `MercadoLivreTrendsDemandSource failed: HTTP ${response.status}`,
      );
    }

    const trends = (await response.json()) as Array<{ keyword: string }>;

    return trends.map((trend, index) => ({
      keyword: trend.keyword,
      intent: "PRODUCT_RESEARCH",
      source: this.name,
      category: this.categoryId,
      observedCount: Math.max(1, trends.length - index),
    }));
  }
}

import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { DemandSignal, DemandSource } from "../types";

const API_BASE = "https://api.mercadolibre.com";

/**
 * GET /highlights/{site_id}/category/{category_id} — confirmed via
 * developers.mercadolibre.com research on 2026-09-07: returns the top 20
 * best-selling items in a category as
 * `{ content: [{ id, position, type }] }`, `id` being an ML item id
 * (e.g. "MLB1481736854"), not a natural-language keyword. Requires
 * Authorization: Bearer, same as trends.
 *
 * A DemandSignal needs a real keyword, so this source resolves each item's
 * title via `resolveTitle` (inject `MercadoLivreProvider.getProduct` in
 * real use; a fake resolver in tests) rather than using the raw item id as
 * a fabricated "keyword". An item that fails to resolve is skipped, never
 * given a placeholder title.
 *
 * `observedCount` is the same rank-inversion as
 * MercadoLivreTrendsDemandSource, derived from the real `position` field —
 * never a fabricated volume. Also not wired into
 * lib/demand/index.ts's DEFAULT_SOURCES — see that file's sibling
 * trends source for why.
 */
export class MercadoLivreBestsellerDemandSource implements DemandSource {
  readonly name = "mercado_livre_highlights";

  constructor(
    private readonly categoryId: string,
    private readonly resolveTitle: (itemId: string) => Promise<string | null>,
  ) {}

  async collect(): Promise<DemandSignal[]> {
    if (
      !env.MERCADO_LIVRE_ENABLED ||
      !env.MERCADO_LIVRE_API_ENABLED ||
      !env.MERCADO_LIVRE_ACCESS_TOKEN
    ) {
      throw new Error(
        "MercadoLivreBestsellerDemandSource requires MERCADO_LIVRE_ENABLED, MERCADO_LIVRE_API_ENABLED " +
          "and MERCADO_LIVRE_ACCESS_TOKEN. See docs/MONETIZATION_SCORE.md.",
      );
    }

    const path = `/highlights/${env.MERCADO_LIVRE_SITE_ID}/category/${this.categoryId}`;
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${env.MERCADO_LIVRE_ACCESS_TOKEN}` },
    });

    if (!response.ok) {
      logger.error("mercado_livre.highlights_failed", {
        categoryId: this.categoryId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreBestsellerDemandSource failed: HTTP ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      content: Array<{ id: string; position: number; type: string }>;
    };

    const signals = await Promise.all(
      body.content
        .filter((entry) => entry.type === "ITEM")
        .map(async (entry) => {
          const title = await this.resolveTitle(entry.id);
          if (!title) return null;
          const signal: DemandSignal = {
            keyword: title,
            intent: "BEST_OF",
            source: this.name,
            category: this.categoryId,
            observedCount: Math.max(1, body.content.length - entry.position + 1),
          };
          return signal;
        }),
    );

    return signals.filter((s): s is DemandSignal => s !== null);
  }
}

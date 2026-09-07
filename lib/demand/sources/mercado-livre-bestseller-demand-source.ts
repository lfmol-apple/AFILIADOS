import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { DemandSignal, DemandSource } from "../types";

const API_BASE = "https://api.mercadolibre.com";

export interface ResolvedHighlight {
  itemId: string;
  position: number;
  title: string;
}

/**
 * GET /highlights/{site_id}/category/{category_id} — confirmed via
 * developers.mercadolibre.com research on 2026-09-07: returns the top 20
 * best-selling items in a category as
 * `{ content: [{ id, position, type }] }`, `id` being an ML item id
 * (e.g. "MLB1481736854"), not a natural-language keyword. Requires
 * Authorization: Bearer, same as trends.
 *
 * `collectRaw()` is the source of truth (real item id + real position +
 * resolved title); `collect()` maps it to the DemandSignal shape the wider
 * DemandEngine expects (keyword-only — see lib/demand/types.ts, a shared
 * interface this file must not change just for its own convenience). Any
 * caller that needs the actual item id (e.g. to persist a
 * MerchantListing/MerchantListingSignal row — see
 * scripts/ml-demand-e2e-check.ts) must use `collectRaw()`, not `collect()`.
 *
 * Each item's title is resolved via `resolveTitle` (inject
 * `MercadoLivreProvider.getProduct` in real use; a fake resolver in tests)
 * rather than using the raw item id as a fabricated "keyword". An item
 * that fails to resolve is skipped, never given a placeholder title.
 *
 * `observedCount`/position-derived weight: rank-inverted from the real
 * `position` field, never a fabricated volume. Also not wired into
 * lib/demand/index.ts's DEFAULT_SOURCES — see that file's sibling trends
 * source for why.
 */
export class MercadoLivreBestsellerDemandSource implements DemandSource {
  readonly name = "mercado_livre_highlights";

  constructor(
    private readonly categoryId: string,
    private readonly resolveTitle: (itemId: string) => Promise<string | null>,
  ) {}

  async collect(): Promise<DemandSignal[]> {
    const highlights = await this.collectRaw();
    const total = highlights.length;
    return highlights.map((h) => ({
      keyword: h.title,
      intent: "BEST_OF",
      source: this.name,
      category: this.categoryId,
      observedCount: Math.max(1, total - h.position + 1),
    }));
  }

  async collectRaw(): Promise<ResolvedHighlight[]> {
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

    const resolved = await Promise.all(
      body.content
        .filter((entry) => entry.type === "ITEM")
        .map(async (entry): Promise<ResolvedHighlight | null> => {
          const title = await this.resolveTitle(entry.id);
          if (!title) return null;
          return { itemId: entry.id, position: entry.position, title };
        }),
    );

    return resolved.filter((h): h is ResolvedHighlight => h !== null);
  }
}

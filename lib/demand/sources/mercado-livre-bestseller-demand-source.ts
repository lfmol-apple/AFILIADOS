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
 * GET /highlights/{site_id}/category/{category_id} — path/shape confirmed
 * via developers.mercadolibre.com research (2026-09-07), corrected against
 * a REAL response the same day: returns
 * `{ content: [{ id, position, type }] }`, but `type` is `"PRODUCT"`
 * (catalog-level canonical product — e.g. "Samsung Galaxy A17"), not
 * `"ITEM"` as first assumed from the docs. `id` is a catalog product id,
 * resolved via GET /products/{id} (MercadoLivreProvider.getCatalogProductName),
 * NOT GET /items/{id} — the two are different resources that both use
 * "MLB..." ids, confirmed by GET /items/{highlightId} 404ing on a real
 * highlighted id while GET /products/{highlightId} resolved it correctly.
 * Accepts both "PRODUCT" and "ITEM" as a type, in case a category ever
 * highlights an item-type entry instead — never silently drops a type this
 * file hasn't seen without at least trying to resolve it. Requires
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
 * Each entry's title is resolved via `resolveTitle` (inject
 * `MercadoLivreProvider.getCatalogProductName` in real use; a fake resolver
 * in tests) rather than using the raw id as a fabricated "keyword". An
 * entry that fails to resolve is skipped, never given a placeholder title.
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
    /** Same rationale as MercadoLivreTrendsDemandSource's sibling
     * parameter — defaults to the static env token (unchanged behavior),
     * overridden by the automated job with the auto-refreshing token
     * store so an unattended run doesn't die after ~6h. */
    private readonly getAccessToken: () => Promise<string> | string = () =>
      env.MERCADO_LIVRE_ACCESS_TOKEN,
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
    if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
      throw new Error(
        "MercadoLivreBestsellerDemandSource requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED. " +
          "See docs/MONETIZATION_SCORE.md.",
      );
    }
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error(
        "MercadoLivreBestsellerDemandSource has no access token available. See docs/MONETIZATION_SCORE.md.",
      );
    }

    const path = `/highlights/${env.MERCADO_LIVRE_SITE_ID}/category/${this.categoryId}`;
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
        .filter((entry) => entry.type === "PRODUCT" || entry.type === "ITEM")
        .map(async (entry): Promise<ResolvedHighlight | null> => {
          const title = await this.resolveTitle(entry.id);
          if (!title) return null;
          return { itemId: entry.id, position: entry.position, title };
        }),
    );

    return resolved.filter((h): h is ResolvedHighlight => h !== null);
  }
}

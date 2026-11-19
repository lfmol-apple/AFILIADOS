import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

const API_BASE = "https://api.mercadolibre.com";

export interface KeywordSearchResult {
  itemId: string;
  title: string;
  categoryId: string | null;
}

/**
 * GET /products/search?status=active&site_id={site}&q={keyword} —
 * Mercado Livre's CATALOG product-search endpoint, used here to turn a
 * cross-category trending KEYWORD (from MercadoLivreTrendsDemandSource,
 * currently collected but never persisted — see that file's own doc
 * comment) into real, resolvable catalog products. This is how the
 * Vitrine finds a product that isn't tied to any of the 13 regularly-
 * scanned categories or to any active commercial-calendar event (project
 * brief section 2: "identificar uma tendência comercial inesperada, mesmo
 * que não prevista no calendário").
 *
 * NOT `/sites/{site_id}/search` (the consumer-facing search consumers hit
 * typing into the site's search bar) — confirmed live, 2026-11-19, that
 * endpoint returns a flat 403 "forbidden" for this project's access
 * token, consistent with Mercado Livre having restricted/deprecated
 * third-party access to it. `/products/search` is a different, still-
 * open endpoint (confirmed 200 with real results the same day) that
 * happens to serve the same purpose for this use case: it returns
 * catalog-level products (an `id` that IS a catalog product id, same kind
 * `MercadoLivreBestsellerDemandSource` already resolves), not individual
 * seller listings.
 *
 * Returns the top `limit` real results — never invents a match when the
 * API returns nothing for a keyword.
 */
export async function searchMercadoLivreByKeyword(
  keyword: string,
  getAccessToken: () => Promise<string> | string,
  limit = 5,
): Promise<KeywordSearchResult[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("searchMercadoLivreByKeyword has no access token available.");
  }

  const url = `${API_BASE}/products/search?status=active&site_id=${env.MERCADO_LIVRE_SITE_ID}&q=${encodeURIComponent(keyword)}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    logger.error("mercado_livre.keyword_search_failed", { keyword, status: response.status });
    throw new Error(`searchMercadoLivreByKeyword failed: HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    results?: Array<{ id?: string; name?: string; domain_id?: string }>;
  };
  return (body.results ?? [])
    .slice(0, limit)
    .filter((r): r is { id: string; name: string; domain_id?: string } => Boolean(r.id && r.name))
    .map((r) => ({
      itemId: r.id,
      title: r.name,
      // domain_id (e.g. "MLB-MICROPHONES") is Mercado Livre's own
      // product-domain taxonomy, NOT the category id format
      // lib/config/commercial-calendar.ts uses (MLB1051 etc.) — kept null
      // here rather than passed off as a category match it isn't.
      categoryId: null,
    }));
}

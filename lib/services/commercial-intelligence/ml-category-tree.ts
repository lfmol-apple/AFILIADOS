import { env } from "@/lib/config/env";

const API_BASE = "https://api.mercadolibre.com";

/**
 * Real Mercado Livre category tree — GET /sites/{site}/categories (top
 * level, confirmed live 2026-11-19: ~30 real categories). Owner's
 * authorization, 2026-11-19, section 1: "não limite a descoberta aos
 * produtos existentes no nosso banco" / "explore de maneira inteligente
 * as categorias e subcategorias relevantes" — this widens promotional-
 * event discovery (jobs/vitrine-discovery.ts) beyond the 13 hand-picked
 * categories in lib/config/ml-demand-categories.ts, which exist for the
 * regular rotation's own call-budget reasons, not as the full universe.
 *
 * Deliberately top-level only for now (not a full recursive subcategory
 * crawl): each top-level category already covers millions of real items
 * per Mercado Livre's own `total_items_in_this_category` field, and a
 * full recursive crawl would be a much larger, separate effort. Scanning
 * every top-level category's bestseller highlights (not just 13 of ~30)
 * is still a real, meaningful broadening, honestly scoped as such.
 */
export interface MlTopLevelCategory {
  id: string;
  name: string;
}

let cachedCategories: { at: number; value: MlTopLevelCategory[] } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function fetchTopLevelCategories(
  getAccessToken: () => Promise<string> | string,
): Promise<MlTopLevelCategory[]> {
  if (cachedCategories && Date.now() - cachedCategories.at < CACHE_TTL_MS) {
    return cachedCategories.value;
  }
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_BASE}/sites/${env.MERCADO_LIVRE_SITE_ID}/categories`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`fetchTopLevelCategories failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as Array<{ id: string; name: string }>;
  const value = body.map((c) => ({ id: c.id, name: c.name }));
  cachedCategories = { at: Date.now(), value };
  return value;
}

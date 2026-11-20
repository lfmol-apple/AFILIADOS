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

/**
 * Real root cause, 2026-11-20 (owner's directive, "Etapa 1 — Discovery"):
 * 4 of the 9 VITRINE_DISCOVERY errors (reproduced live, isolated
 * environment) were HTTP 404 on GET /highlights for these exact 4 real,
 * valid top-level categories — confirmed via a direct GET
 * /categories/{id}: Carros, Motos e Outros (MLB1743), Imóveis (MLB1459),
 * Ingressos (MLB218519), Serviços (MLB1540). Each has
 * `buying_allowed:false` or `listing_allowed:false` in its real
 * `settings` — classified-ad/service categories, not a physical-product
 * retail catalog, so Mercado Livre's own highlights/bestseller endpoint
 * structurally doesn't exist for them. Not a config typo to fix — these
 * are also commercially irrelevant to a catalog-ad business (you can't
 * run a dynamic product-catalog ad for a car listing or a service), so
 * excluding them is correct on both grounds, not just to silence the
 * error.
 */
const NON_PHYSICAL_PRODUCT_CATEGORY_IDS = new Set([
  "MLB1743", // Carros, Motos e Outros
  "MLB1459", // Imóveis
  "MLB218519", // Ingressos
  "MLB1540", // Serviços
]);

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
  const value = body
    .filter((c) => !NON_PHYSICAL_PRODUCT_CATEGORY_IDS.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));
  cachedCategories = { at: Date.now(), value };
  return value;
}

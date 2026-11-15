import { prisma } from "@/lib/db";
import {
  createMercadoLivreProvider,
  getValidMercadoLivreAccessToken,
} from "@/lib/services/ml-token-store";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import { ML_ALL_SCAN_CATEGORIES } from "@/lib/config/ml-demand-categories";
import { logger } from "@/lib/observability/logger";

export interface HighlightCandidate {
  catalogProductId: string;
  title: string;
  productUrl: string;
}

interface RawHighlight {
  catalogProductId: string;
  title: string;
  position: number;
}

const TTL_MS = 30 * 60 * 1000;

const g = globalThis as unknown as {
  __mlHighlightCache?: { at: number; items: RawHighlight[] } | null;
};

/**
 * Real Mercado Livre demand, read via the OFFICIAL, authenticated
 * `GET /highlights/{site}/category/{id}` API (lib/demand/sources/
 * mercado-livre-bestseller-demand-source.ts — the same endpoint
 * jobs/ml-demand.ts used before 2026-09-24) — never a crawl of ML's own
 * search/listing pages: ML's own robots.txt explicitly disallows
 * ClaudeBot/Claude-User from the whole site (confirmed live, 2026-11-15),
 * so resolving a raw search term to a product by reading search-result
 * HTML is off the table for this agent. Highlights sidesteps that
 * entirely: it's a real REST call with our own bearer token, not a page
 * fetch, and it returns a real catalog product id directly (never a
 * guessed/scraped one).
 *
 * Unlike the old ML_DEMAND job, this never writes anything on its own —
 * it only feeds /admin/produtos-em-alta's batch-of-30 flow
 * (owner's brief, 2026-11-15: "eu só gero [o link] e colo"). A product
 * only ever enters the database once the owner has generated and pasted
 * a real affiliate link for it (lib/services/ml-trending-register.ts).
 */
async function fetchRawHighlights(): Promise<RawHighlight[]> {
  const provider = await createMercadoLivreProvider();
  const perCategory = await Promise.all(
    ML_ALL_SCAN_CATEGORIES.map(async (category) => {
      try {
        const source = new MercadoLivreBestsellerDemandSource(
          category.id,
          (id) => provider.getCatalogProductName(id),
          getValidMercadoLivreAccessToken,
        );
        const highlights = await source.collectRaw();
        return highlights.map((h) => ({
          catalogProductId: h.itemId,
          title: h.title,
          position: h.position,
        }));
      } catch (error) {
        logger.warn("ml_highlight_candidates.category_failed", {
          categoryId: category.id,
          message: String(error),
        });
        return [];
      }
    }),
  );
  return perCategory.flat();
}

function refresh(): Promise<RawHighlight[]> {
  return fetchRawHighlights().then((items) => {
    g.__mlHighlightCache = { at: Date.now(), items };
    return items;
  });
}

async function loadRawHighlights(): Promise<RawHighlight[]> {
  if (g.__mlHighlightCache && Date.now() - g.__mlHighlightCache.at < TTL_MS) {
    return g.__mlHighlightCache.items;
  }
  return refresh();
}

/** Catalog product ids that already have an ACTIVE Mercado Livre
 * affiliate link — checked fresh every call (cheap) so a product the
 * owner just registered disappears immediately, even mid cache window. */
async function loadActiveCatalogProductIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.merchantListing.findMany({
    where: {
      merchant: { code: "MERCADO_LIVRE" },
      externalId: { in: ids },
      affiliateLink: { status: "ACTIVE" },
    },
    select: { externalId: true },
  });
  return new Set(rows.map((r) => r.externalId));
}

export async function loadHighlightCandidates(
  limit = 30,
): Promise<HighlightCandidate[]> {
  const raw = await loadRawHighlights();
  const sorted = [...raw].sort((a, b) => a.position - b.position);

  const seen = new Set<string>();
  const deduped = sorted.filter((h) => {
    if (seen.has(h.catalogProductId)) return false;
    seen.add(h.catalogProductId);
    return true;
  });

  const activeIds = await loadActiveCatalogProductIds(
    deduped.map((h) => h.catalogProductId),
  );
  const available = deduped.filter((h) => !activeIds.has(h.catalogProductId));

  return available.slice(0, limit).map((h) => ({
    catalogProductId: h.catalogProductId,
    title: h.title,
    productUrl: `https://www.mercadolivre.com.br/p/${h.catalogProductId}`,
  }));
}

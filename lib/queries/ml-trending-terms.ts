import { prisma } from "@/lib/db";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";

export interface TrendingTerm {
  keyword: string;
  url: string;
}

const TTL_MS = 5 * 60 * 1000;

const g = globalThis as unknown as {
  __mlTrendingTermsCache?: { at: number; items: TrendingTerm[] } | null;
};

async function alreadyRegisteredKeywords(): Promise<Set<string>> {
  const rows = await prisma.merchantListingSignal.findMany({
    where: { source: "trending_term_pick" },
    select: { raw: true },
  });
  const keywords = new Set<string>();
  for (const row of rows) {
    const raw = row.raw as { keyword?: string } | null;
    if (raw?.keyword) keywords.add(raw.keyword);
  }
  return keywords;
}

/**
 * Mercado Livre's own real-time trending search terms
 * (lib/providers/mercado-livre-provider.ts's getTrends()), minus whatever
 * the owner already turned into a product via
 * lib/services/ml-trending-register.ts. Cached briefly so reloading the
 * admin page doesn't re-hit the API every time.
 */
export async function loadTrendingTerms(): Promise<TrendingTerm[]> {
  if (g.__mlTrendingTermsCache && Date.now() - g.__mlTrendingTermsCache.at < TTL_MS) {
    return g.__mlTrendingTermsCache.items;
  }

  const provider = await createMercadoLivreProvider();
  const [trends, done] = await Promise.all([
    provider.getTrends(),
    alreadyRegisteredKeywords(),
  ]);
  const items = trends.filter((t) => !done.has(t.keyword));
  g.__mlTrendingTermsCache = { at: Date.now(), items };
  return items;
}

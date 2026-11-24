import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { getValidMercadoLivreAccessToken } from "@/lib/services/ml-token-store";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { loadRegisteredCatalogIds } from "@/lib/services/ml-panel-queue-data";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";

/**
 * "Pega carona" no que o país está buscando agora: GET /trends/{site}/
 * {category} — official, authenticated, real search-demand ranking (top
 * 50 keywords, updated weekly by Mercado Livre itself). Confirmed live,
 * 2026-11-16: GET /sites/{site}/search (resolving a keyword to items) is
 * blocked (403 forbidden) for this app, so a trending keyword can't be
 * turned into a product via the API. Instead, this matches each trending
 * keyword's words against the titles we already have real commission
 * data for (ML_PANEL_PICKS) — same idea as isAlreadyOnSite()'s token
 * overlap in ml-panel-queue.ts, just the inverse direction. Read-only,
 * writes nothing.
 */
const CATEGORIES: Array<{ id: string; group: string }> = [
  { id: "MLB1051", group: "celulares" },
  { id: "MLB5726", group: "eletrodomesticos" },
  { id: "MLB1574", group: "casa" },
  { id: "MLB1246", group: "beleza" },
  { id: "MLB263532", group: "ferramentas" },
  { id: "MLB1276", group: "esportes" },
  { id: "MLB1071", group: "pet" },
  { id: "MLB1430", group: "calcados" },
];

const STOP = new Set(["de", "da", "do", "para", "com", "e", "em", "kit", "x", "a", "o"]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

async function fetchTrends(accessToken: string, categoryId: string): Promise<string[]> {
  const response = await fetch(
    `https://api.mercadolibre.com/trends/${env.MERCADO_LIVRE_SITE_ID}/${categoryId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) return [];
  const trends = (await response.json()) as Array<{ keyword: string }>;
  return trends.map((t) => t.keyword);
}

async function main() {
  const [accessToken, registeredCatalog] = await Promise.all([
    getValidMercadoLivreAccessToken(),
    loadRegisteredCatalogIds(),
  ]);

  const byGroup = new Map<string, typeof ML_PANEL_PICKS extends readonly (infer T)[] ? T[] : never>();
  for (const pick of ML_PANEL_PICKS) {
    const list = byGroup.get(pick.group) ?? [];
    list.push(pick);
    byGroup.set(pick.group, list);
  }

  let totalMatches = 0;
  for (const cat of CATEGORIES) {
    const keywords = await fetchTrends(accessToken, cat.id);
    const picks = byGroup.get(cat.group) ?? [];
    const matches: Array<{ keyword: string; title: string; rate: number; price: number; sold: number; rating: number | null; productUrl?: string }> = [];
    const seen = new Set<string>();

    for (const keyword of keywords) {
      const kwTokens = tokens(keyword);
      if (kwTokens.length === 0) continue;
      for (const pick of picks) {
        const { catalogId } = expectedIdsFromProductUrl(pick.productUrl);
        if (catalogId && registeredCatalog.has(catalogId)) continue;
        if (seen.has(pick.id)) continue;
        const titleTokens = new Set(tokens(pick.title));
        const hit = kwTokens.every((t) => titleTokens.has(t));
        if (hit) {
          seen.add(pick.id);
          matches.push({
            keyword,
            title: pick.title,
            rate: pick.rate,
            price: pick.price,
            sold: pick.sold,
            rating: pick.rating,
            productUrl: pick.productUrl,
          });
        }
      }
    }

    matches.sort((a, b) => b.rate * b.price - a.rate * a.price);
    console.log(`\n=== ${cat.group} — ${keywords.length} termos em alta, ${matches.length} produtos nossos batem ===`);
    for (const m of matches.slice(0, 10)) {
      console.log(
        `  "${m.keyword}" -> R$ ${(m.rate * m.price).toFixed(2)}/venda  +${m.sold}  nota ${m.rating ?? "–"}  ${m.title.slice(0, 60)}`,
      );
    }
    totalMatches += matches.length;
  }

  console.log(`\nTOTAL de produtos nossos que batem em algum termo de busca em alta: ${totalMatches}`);
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

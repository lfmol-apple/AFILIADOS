import { prisma } from "@/lib/db";
import { loadHighlightCandidates } from "@/lib/queries/ml-highlight-candidates";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";
import { loadRegisteredCatalogIds } from "@/lib/services/ml-panel-queue-data";

/**
 * Crosses two real, independent Mercado Livre signals — never a new one of
 * our own, never fabricated:
 *
 *   "Quente agora": the official Highlights API (GET /highlights/{site}/
 *   category/{id}, via loadHighlightCandidates() — the same live feed
 *   /admin/produtos-em-alta uses), which says what's trending right now
 *   but carries no commission/price/sales data.
 *
 *   "Paga bem": ML_PANEL_PICKS, the owner's own real reads of the
 *   affiliate panel's commission list — real rate/price/sold/rating, but
 *   a point-in-time snapshot, not live.
 *
 * Matches on the Mercado Livre catalog id (MLB…) extracted from each
 * side's own URL. A product in both lists is trending right now AND known
 * to pay a real commission — the two together are the actual "quente e
 * inteligente" signal neither list gives alone. Read-only: never writes
 * anything, exactly like /admin/produtos-em-alta before a link is pasted.
 *
 * Usage: npm run jobs:run -- (not wired to the job runner — just run
 * directly) npx tsx scripts/ml-hot-and-profitable.ts
 */
async function main() {
  const [highlights, registeredCatalog] = await Promise.all([
    loadHighlightCandidates(),
    loadRegisteredCatalogIds(),
  ]);

  const hotIds = new Map<string, { title: string; position?: number }>();
  for (const h of highlights) {
    hotIds.set(h.catalogProductId, { title: h.title });
  }

  console.log(`Destaques ao vivo (quente agora): ${highlights.length} produtos, ${hotIds.size} ids únicos.`);

  const matches: Array<{
    catalogId: string;
    title: string;
    group: string;
    rate: number;
    price: number;
    sold: number;
    rating: number | null;
    earningPerSale: number;
    productUrl?: string;
  }> = [];

  const seenCatalogIds = new Set<string>();
  for (const pick of ML_PANEL_PICKS) {
    const { catalogId } = expectedIdsFromProductUrl(pick.productUrl);
    if (!catalogId) continue;
    if (!hotIds.has(catalogId)) continue;
    if (registeredCatalog.has(catalogId)) continue; // already linked, not actionable
    if (seenCatalogIds.has(catalogId)) continue; // same product read more than once
    seenCatalogIds.add(catalogId);
    matches.push({
      catalogId,
      title: pick.title,
      group: pick.group,
      rate: pick.rate,
      price: pick.price,
      sold: pick.sold,
      rating: pick.rating,
      earningPerSale: pick.rate * pick.price,
      productUrl: pick.productUrl,
    });
  }

  matches.sort((a, b) => b.earningPerSale - a.earningPerSale);

  console.log(`\nInterseção (quente agora + paga bem + ainda sem link): ${matches.length} produtos.\n`);
  for (const m of matches.slice(0, 40)) {
    console.log(
      `${m.group.padEnd(16)} R$ ${m.earningPerSale.toFixed(2).padStart(8)}/venda  +${m.sold}  nota ${m.rating ?? "–"}  ${m.title.slice(0, 70)}`,
    );
  }
  if (matches.length > 40) {
    console.log(`... e mais ${matches.length - 40}.`);
  }
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { prisma } from "@/lib/db";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { rankAllForLinking, catalogFirst } from "@/lib/services/ml-panel-queue";
import { loadRegisteredPanelIds } from "@/lib/services/ml-panel-register";
import { loadRegisteredCatalogIds } from "@/lib/services/ml-panel-queue-data";
import { loadIssuePanelIds, recordPanelIssue } from "@/lib/services/ml-panel-issues";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";

/**
 * Owner's report, 2026-11-16: "tem muito link que não abre e lixo" in the
 * queue — expected, since most of it is a Sept 2026 read and products
 * come and go on Mercado Livre. This checks every pending row's catalog
 * id against the real, official GET /products/{id} API (never scraping
 * mercadolivre.com itself) and records a `manual` MlPanelPickIssue for
 * any that cleanly 404 — loadPanelQueue() already excludes issue rows,
 * so this is the one legitimate way to make the queue stop offering a
 * product that's genuinely gone, without guessing or deleting data.
 *
 * Rows without a catalog id (/up/ "user product" addresses) are left
 * untouched: Mercado Livre's API has no endpoint this app can use to
 * check those, and fetching the public mercadolivre.com page directly
 * would be scraping — explicitly ruled out elsewhere in this project
 * (ML's robots.txt disallows it, and docs/AUTOMATION.md's "não existe
 * scraping nem RPA" decision). catalogFirst() already ranks those last,
 * so they stay low-priority rather than hidden.
 */
const CONCURRENCY = 6;

async function main() {
  const [registered, registeredCatalog, issues] = await Promise.all([
    loadRegisteredPanelIds(),
    loadRegisteredCatalogIds(),
    loadIssuePanelIds(),
  ]);

  const { toLink } = rankAllForLinking(ML_PANEL_PICKS, []);
  const sameProductOnSite = (e: (typeof toLink)[number]) => {
    const catalogId = expectedIdsFromProductUrl(e.pick.productUrl).catalogId;
    return !!catalogId && registeredCatalog.has(catalogId);
  };
  const notRegistered = toLink.filter(
    (e) =>
      !registered.has(e.pick.id) &&
      !issues.has(e.pick.id) &&
      !sameProductOnSite(e),
  );
  const pending = catalogFirst(notRegistered.filter((e) => e.pick.productUrl));

  const withCatalogId = pending
    .map((e) => ({ entry: e, catalogId: expectedIdsFromProductUrl(e.pick.productUrl).catalogId }))
    .filter((x): x is { entry: (typeof pending)[number]; catalogId: string } => !!x.catalogId);

  const withoutCatalogId = pending.length - withCatalogId.length;

  console.log(`Pendentes hoje: ${pending.length}`);
  console.log(`  com id de catálogo (verificáveis via API real): ${withCatalogId.length}`);
  console.log(`  sem id de catálogo (endereço /up/, não dá pra verificar sem scraping): ${withoutCatalogId}`);
  console.log(`\nVerificando ${withCatalogId.length} contra GET /products/{id} (pode levar alguns minutos)...\n`);

  const provider = await createMercadoLivreProvider();
  let alive = 0;
  let dead = 0;
  let ambiguous = 0;
  const deadTitles: string[] = [];

  for (let i = 0; i < withCatalogId.length; i += CONCURRENCY) {
    const chunk = withCatalogId.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async ({ entry, catalogId }) => {
        try {
          const name = await provider.getCatalogProductName(catalogId);
          if (name === null) {
            dead++;
            deadTitles.push(entry.pick.title);
            await recordPanelIssue(
              entry.pick.id,
              "manual",
              `produto não resolve mais no catálogo ML (404 em GET /products/${catalogId}), verificado em massa 2026-11-16`,
            );
          } else {
            alive++;
          }
        } catch {
          // Any error other than a clean 404 (403, 5xx, network) is NOT
          // proof the product is gone — never mark dead on ambiguous
          // evidence, same "no fabricated facts" rule as the rest of
          // this project.
          ambiguous++;
        }
      }),
    );
    if ((i / CONCURRENCY) % 20 === 0) {
      console.log(`  ... ${Math.min(i + CONCURRENCY, withCatalogId.length)}/${withCatalogId.length}`);
    }
  }

  console.log(`\nResultado:`);
  console.log(`  vivos (confirmados reais): ${alive}`);
  console.log(`  mortos (404 real, removidos da fila agora): ${dead}`);
  console.log(`  ambíguos (erro que não prova nada, mantidos na fila): ${ambiguous}`);
  if (deadTitles.length > 0) {
    console.log(`\nAlguns removidos:`);
    for (const t of deadTitles.slice(0, 20)) console.log(`  - ${t.slice(0, 70)}`);
  }
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

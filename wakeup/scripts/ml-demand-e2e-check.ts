/**
 * Manual, human-run check that the real Mercado Livre integration actually
 * works end-to-end once MERCADO_LIVRE_ACCESS_TOKEN exists — trends,
 * highlights (for a small, human-picked category list), and a single item
 * lookup. Never wired into jobs/ — this is a diagnostic tool, not
 * automation, matching scripts/merchant-backfill-amazon.ts's pattern.
 *
 * Usage:
 *   npx tsx scripts/ml-demand-e2e-check.ts [--category MLB1051] [--item MLB123456] [--persist]
 *
 * Without --persist, this only prints what it found — no database writes.
 * With --persist, real observed signals (trend/bestseller rank) are
 * upserted into MerchantListing + MerchantListingSignal, exactly what the
 * project brief asks for ("testar uma lista pequena de categorias...
 * persistir sinais reais em MerchantListingSignal"). Uses
 * MercadoLivreBestsellerDemandSource.collectRaw() (real itemId), not
 * collect() (DemandSignal — keyword-only, loses the item id on purpose,
 * since that's a shared interface). Never publishes anything, never
 * creates a public page, never touches AffiliateLinkRegistry.
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { MercadoLivreTrendsDemandSource } from "@/lib/demand/sources/mercado-livre-trends-demand-source";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import {
  ensureMercadoLivreMerchant,
  persistHighlightSignal as persistHighlightSignalShared,
} from "@/lib/services/ml-demand-collector";

function parseArgs() {
  const args = process.argv.slice(2);
  const categories: string[] = [];
  let item: string | undefined;
  let persist = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category") categories.push(args[++i]!);
    else if (args[i] === "--item") item = args[++i];
    else if (args[i] === "--persist") persist = true;
  }
  return { categories, item, persist };
}

async function main() {
  if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED || !env.MERCADO_LIVRE_ACCESS_TOKEN) {
    console.error(
      "MERCADO_LIVRE_ENABLED, MERCADO_LIVRE_API_ENABLED and MERCADO_LIVRE_ACCESS_TOKEN must all be set. " +
        "See docs/AFFILIATE_LINK_REGISTRY.md for how to obtain a real token.",
    );
    process.exitCode = 1;
    return;
  }

  const { categories, item, persist } = parseArgs();
  // Auto-refreshing token for the provider-based calls below (catalog
  // product name resolution, single-item lookup). The trends/highlights
  // demand sources still read the static MERCADO_LIVRE_ACCESS_TOKEN env
  // var directly (unchanged, lib/demand/sources/*) — not migrated to the
  // auto-refresh path in this pass, since they make far fewer calls per
  // run and are lower-risk of hitting mid-run expiry; see
  // docs/MONETIZATION_SCORE.md for this documented scope boundary.
  const provider = await createMercadoLivreProvider();
  const merchant = persist ? await ensureMercadoLivreMerchant() : null;

  console.log("=== Trends (site-wide) ===");
  const trends = await new MercadoLivreTrendsDemandSource().collect();
  console.log(`${trends.length} keywords found.`);
  for (const signal of trends.slice(0, 10)) {
    console.log(`  ${signal.keyword} (observedCount=${signal.observedCount})`);
  }

  for (const categoryId of categories) {
    console.log(`\n=== Highlights: ${categoryId} ===`);
    // Highlights entries are catalog products (GET /products/{id}), not
    // items (GET /items/{id}) — confirmed 2026-09-07 (see
    // lib/demand/sources/mercado-livre-bestseller-demand-source.ts).
    const source = new MercadoLivreBestsellerDemandSource(categoryId, (id) =>
      provider.getCatalogProductName(id),
    );
    const highlights = await source.collectRaw();
    console.log(`${highlights.length} resolved items.`);
    for (const h of highlights) {
      console.log(`  #${h.position} ${h.itemId} — ${h.title}`);
    }

    if (persist && merchant) {
      for (const h of highlights) {
        await persistHighlightSignalShared({
          merchantId: merchant.id,
          itemId: h.itemId,
          position: h.position,
        });
      }
      console.log(`  Persisted ${highlights.length} signal(s).`);
    }
  }

  if (item) {
    console.log(`\n=== Item lookup: ${item} ===`);
    const product = await provider.getProduct(item);
    console.log(product ? JSON.stringify(product, null, 2) : "Not found (404).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

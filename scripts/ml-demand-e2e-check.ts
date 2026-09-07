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
import { MercadoLivreProvider } from "@/lib/providers/mercado-livre-provider";
import { MercadoLivreTrendsDemandSource } from "@/lib/demand/sources/mercado-livre-trends-demand-source";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";

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

async function ensureMercadoLivreMerchant() {
  return prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
}

async function persistHighlightSignal(input: {
  merchantId: string;
  itemId: string;
  title: string;
  position: number;
  categoryId: string;
}) {
  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: input.merchantId,
        marketplace: "BR",
        externalId: input.itemId,
      },
    },
    create: {
      merchantId: input.merchantId,
      externalId: input.itemId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: `https://produto.mercadolivre.com.br/${input.itemId}`,
      // A human/script confirmed this listing is real via a live API call
      // — not fabricated, not demo data — but the facts weren't manually
      // typed by a human either, so MANUAL_VERIFIED is the closest honest
      // fit among the existing DataSource values (see
      // lib/config/public-catalog.ts's doc comment on the enum). Never
      // AMAZON_API — this is not Amazon.
      source: "MANUAL_VERIFIED",
    },
    update: { productUrl: `https://produto.mercadolivre.com.br/${input.itemId}` },
  });

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "mercado_livre_highlights",
      bestsellerRank: input.position,
    },
  });

  return listing;
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
  const provider = new MercadoLivreProvider();
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
        await persistHighlightSignal({
          merchantId: merchant.id,
          itemId: h.itemId,
          title: h.title,
          position: h.position,
          categoryId,
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

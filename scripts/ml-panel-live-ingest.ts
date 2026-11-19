import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";
import { registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import { logger } from "@/lib/observability/logger";

/**
 * Ingests a real, live affiliate-panel capture (owner's authorization,
 * 2026-11-19, "navegue autonomamente pelo painel... exclusivamente para
 * consulta e leitura") into MerchantListingSignal (source=panel_pick, same
 * convention every other panel capture has used since September) and the
 * new CommercialCandidateRegistry. Read-only on the Mercado Livre side —
 * this script only writes to our own database.
 *
 * Input file shape: the array ml-revenue-capture-safari.ts's extractScript
 * produces (title, url, itemId, rating, sold, commissionRate, price,
 * estimatedCommission, badges, linkMatchesTitle), one JSON file per
 * panel-section capture, saved under data/ml-panel-reads/<section>-<date>.json.
 *
 * Usage: npx tsx scripts/ml-panel-live-ingest.ts --file=data/ml-panel-reads/hub-default-2026-11-19.json --section=panel_bestseller
 */
interface CapturedRow {
  title: string;
  url: string;
  itemId: string | null;
  rating: number | null;
  sold: number | null;
  commissionRate: number | null;
  price: number | null;
  estimatedCommission: number | null;
  badges: string[];
  linkMatchesTitle: boolean;
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function ingestFile(filePath: string, defaultSection: string) {
  const rows = JSON.parse(readFileSync(filePath, "utf8")) as CapturedRow[];
  const merchant = await ensureMercadoLivreMerchant();

  let created = 0;
  let registered = 0;
  let skippedNoId = 0;

  for (const row of rows) {
    if (!row.itemId || !/^MLB\d+$/.test(row.itemId)) {
      skippedNoId += 1;
      logger.info("ml_panel_live_ingest.skipped_no_item_id", { title: row.title.slice(0, 60) });
      continue;
    }

    const listing = await prisma.merchantListing.upsert({
      where: {
        merchantId_marketplace_externalId: {
          merchantId: merchant.id,
          marketplace: "BR",
          externalId: row.itemId,
        },
      },
      create: {
        merchantId: merchant.id,
        externalId: row.itemId,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: row.url,
        source: "MANUAL_VERIFIED",
      },
      update: { productUrl: row.url },
    });

    if (!listing.canonicalProductId) {
      // This is the real ITEM id (seller's own listing), not a catalog
      // product id — lib/services/ml-enrichment-collector.ts's
      // enrichCatalogListing resolves the OTHER direction (catalog -> real
      // item id) and does not apply here. The panel capture already gave
      // us a real title/price/rating directly from the page itself, so a
      // minimal CanonicalProduct is built from that — never fabricated,
      // every field traces to what was actually read off the panel.
      const canonical = await prisma.canonicalProduct.upsert({
        where: { slug: `ml-panel-${row.itemId}` },
        create: { slug: `ml-panel-${row.itemId}`, title: row.title },
        update: { title: row.title },
      });
      await prisma.merchantListing.update({
        where: { id: listing.id },
        data: { canonicalProductId: canonical.id },
      });
    }

    const isExtra = row.badges.includes("GANHOS EXTRAS");
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: "panel_pick",
        raw: {
          rate: row.commissionRate,
          extras: isExtra,
          sold: row.sold,
          rating: row.rating,
          price: row.price,
          badges: row.badges,
          panelSection: defaultSection,
          capturedLiveAt: new Date().toISOString(),
        },
      },
    });
    created += 1;

    await registerCandidate({
      externalId: row.itemId,
      merchantListingId: listing.id,
      sourceType: isExtra ? "panel_extra_commission" : "panel_offered_commission",
      sourceDetail: {
        title: row.title,
        price: row.price,
        rate: row.commissionRate,
        sold: row.sold,
        rating: row.rating,
        badges: row.badges,
        panelSection: defaultSection,
      },
    });
    registered += 1;

    if (row.badges.some((b) => b === "MAIS VENDIDO" || b === "MAIS BUSCADO")) {
      await registerCandidate({
        externalId: row.itemId,
        merchantListingId: listing.id,
        sourceType: "panel_bestseller",
        sourceDetail: { title: row.title, badges: row.badges, sold: row.sold },
      });
    }
  }

  console.log(
    `${path.basename(filePath)}: ${rows.length} linhas, ${created} sinais gravados, ${registered} candidatos registrados, ${skippedNoId} sem itemId resolvível.`,
  );
}

async function main() {
  const file = argValue("file");
  const section = argValue("section") ?? "panel_bestseller";
  if (file) {
    await ingestFile(file, section);
    return;
  }
  // No --file: ingest every *-2026-11-19.json under data/ml-panel-reads/
  // not yet processed (today's live captures).
  const dir = path.join(process.cwd(), "data", "ml-panel-reads");
  const todayFiles = readdirSync(dir).filter((f) => f.includes("2026-11-19") && f.startsWith("hub-"));
  for (const f of todayFiles) {
    const section = f.includes("ganhos-extras") ? "panel_extra_commission" : "panel_bestseller";
    await ingestFile(path.join(dir, f), section);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

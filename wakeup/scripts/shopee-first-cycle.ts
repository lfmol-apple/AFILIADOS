/**
 * The first real Shopee operational cycle: real API -> real product ->
 * affiliate link tagged 'precocaindo' -> persisted -> ready for the
 * internal redirect to track a click. Manual, human-run — not a job, not
 * wired into jobs/ (project brief: "não sofisticar agora"). See
 * jobs/shopee-refresh.ts (Automação Operacional V1, 2026-09-08) for the
 * automated counterpart — same shared logic
 * (lib/services/shopee-cycle-collector.ts), plus
 * locking/retry/partial-failure isolation this manual script doesn't need.
 *
 * Usage:
 *   npx tsx scripts/shopee-first-cycle.ts [--top 15] [--min-score 0]
 *
 * Idempotent: re-running upserts the same MerchantListing rows (unique on
 * [merchantId, marketplace, externalId]) and skips affiliate-link
 * generation entirely for any listing that already has an ACTIVE one — no
 * duplicate rows, no wasted generateShortLink calls on a rerun.
 */
import { prisma } from "@/lib/db";
import { ShopeeProvider } from "@/lib/providers/shopee-provider";
import { scoreOffer, processShopeeOffer } from "@/lib/services/shopee-cycle-collector";

function parseArgs() {
  const args = process.argv.slice(2);
  let top = 15;
  let minScore = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--top") top = Number(args[++i]);
    if (args[i] === "--min-score") minScore = Number(args[++i]);
  }
  return { top, minScore };
}

async function main() {
  const { top, minScore } = parseArgs();
  const provider = new ShopeeProvider();

  console.log("Buscando ofertas reais (Shopee Affiliate API, productOfferV2)...");
  const offers = await provider.listOffers({ page: 1, limit: 50 });
  console.log(`${offers.length} ofertas reais recebidas.`);

  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true, affiliateEnabled: true },
    update: { affiliateEnabled: true },
  });

  const scored = offers
    .map((offer) => ({ offer, score: scoreOffer(offer) }))
    .filter((x) => (x.score.score ?? 0) >= minScore)
    .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0))
    .slice(0, top);

  console.log(
    `Selecionados ${scored.length} de ${offers.length} (top ${top}, minScore ${minScore}).`,
  );

  let linksGenerated = 0;
  let linksReused = 0;

  for (const { offer, score } of scored) {
    const result = await processShopeeOffer(provider, merchant.id, offer, "first_cycle");
    if (result.linkReused) {
      linksReused++;
      console.log(`  [reuso] ${offer.productName} — já tem link ativo.`);
    } else {
      linksGenerated++;
      console.log(`  [novo] ${offer.productName} — score=${score.score}`);
    }
  }

  console.log(
    `\nResumo: ${scored.length} listing(s) processado(s), ${linksGenerated} link(s) novo(s), ${linksReused} reaproveitado(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

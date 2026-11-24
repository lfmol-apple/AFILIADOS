/**
 * Read-only diagnostic for the Acquisition Engine (project brief Fase 16 —
 * "Google Discovery Diagnostic"). Never writes to the database. Reuses the
 * exact same criteria the app itself uses (lib/services/publication-gate.ts,
 * lib/services/merchant-listing-facts.ts, lib/queries/public-product.ts) so
 * this report can never disagree with what /produto/[slug] and
 * app/sitemap.ts actually do.
 *
 * Scope: only Mercado Livre/Shopee counts (the new Acquisition Engine
 * surface) — Amazon's existing catalog is unaffected and already covered
 * by scripts/production-readiness.ts.
 *
 * Usage: npx tsx scripts/seo-readiness-report.ts
 */
import { prisma } from "@/lib/db";
import { evaluatePublicationGate } from "@/lib/services/publication-gate";
import {
  loadMerchantListingFactsByListingId,
  loadMerchantListingFactsByPublicSlug,
} from "@/lib/services/merchant-listing-facts";
import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";

interface MarketplaceTally {
  publicable: number;
  indexable: number;
  noindex: number;
  activeCta: number;
  withoutCta: number;
}

function emptyTally(): MarketplaceTally {
  return { publicable: 0, indexable: 0, noindex: 0, activeCta: 0, withoutCta: 0 };
}

async function main() {
  const [mlCanonicals, shopeeListings] = await Promise.all([
    prisma.canonicalProduct.findMany({
      where: { listings: { some: { merchant: { code: "MERCADO_LIVRE" } } } },
      select: { id: true, slug: true, publicSlug: true, category: { select: { name: true } } },
    }),
    prisma.merchantListing.findMany({
      where: { active: true, merchant: { code: "SHOPEE" } },
      select: { id: true, slug: true },
    }),
  ]);

  const byMarketplace: Record<"MERCADO_LIVRE" | "SHOPEE", MarketplaceTally> = {
    MERCADO_LIVRE: emptyTally(),
    SHOPEE: emptyTally(),
  };
  const byCategory = new Map<string, number>();
  const rejectionReasons = new Map<string, number>();
  let mlWithPublicSlug = 0;
  let shopeeWithSlug = 0;

  for (const canonical of mlCanonicals) {
    // Falls back to the internal ml-catalog-<id> slug when publicSlug
    // hasn't been generated yet — same OR lookup loadPublicMerchantProduct
    // itself uses, so this never undercounts a canonical just because the
    // pretty slug isn't warmed yet.
    const resolved = await loadMerchantListingFactsByPublicSlug(canonical.publicSlug ?? canonical.slug);
    if (!resolved) continue; // No catalog row (only offer rows) or unresolved — not a publicable unit.
    const tally = byMarketplace.MERCADO_LIVRE;
    tally.publicable += 1;
    if (canonical.publicSlug) mlWithPublicSlug += 1;
    const categoryName = canonical.category?.name ?? "(sem categoria)";
    byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + 1);
    const gate = evaluatePublicationGate(resolved.facts);
    if (gate.indexable) tally.indexable += 1;
    else {
      tally.noindex += 1;
      for (const reason of gate.missing) rejectionReasons.set(reason, (rejectionReasons.get(reason) ?? 0) + 1);
    }
    if (gate.ctaEligible) tally.activeCta += 1;
    else tally.withoutCta += 1;
  }

  for (const listing of shopeeListings) {
    const facts = await loadMerchantListingFactsByListingId(listing.id);
    if (!facts) continue;
    const tally = byMarketplace.SHOPEE;
    tally.publicable += 1;
    if (listing.slug) shopeeWithSlug += 1;
    const gate = evaluatePublicationGate(facts);
    if (gate.indexable) tally.indexable += 1;
    else {
      tally.noindex += 1;
      for (const reason of gate.missing) rejectionReasons.set(reason, (rejectionReasons.get(reason) ?? 0) + 1);
    }
    if (gate.ctaEligible) tally.activeCta += 1;
    else tally.withoutCta += 1;
  }

  const sitemapUrls = await listIndexableMerchantProductUrls();
  const totals = emptyTally();
  for (const t of Object.values(byMarketplace)) {
    totals.publicable += t.publicable;
    totals.indexable += t.indexable;
    totals.noindex += t.noindex;
    totals.activeCta += t.activeCta;
    totals.withoutCta += t.withoutCta;
  }

  console.log("SEO READINESS — Mercado Livre / Shopee (Acquisition Engine)");
  console.log("");
  console.log(`Opportunities avaliadas (ML catálogo + Shopee ativos): ${totals.publicable}`);
  console.log(`  Indexable (passam no Publication Gate): ${totals.indexable}`);
  console.log(`  Noindex (não passam no gate ainda): ${totals.noindex}`);
  console.log(`  Com CTA ativo (AffiliateLinkRegistry ACTIVE): ${totals.activeCta}`);
  console.log(`  Sem CTA (sem link afiliado ativo): ${totals.withoutCta}`);
  console.log("");
  console.log("Distribuição por marketplace:");
  for (const [marketplace, t] of Object.entries(byMarketplace)) {
    console.log(`  ${marketplace}: ${t.publicable} avaliadas, ${t.indexable} indexáveis, ${t.activeCta} com CTA ativo`);
  }
  console.log("");
  console.log("Distribuição por categoria (Mercado Livre — Shopee não tem categoria estruturada hoje):");
  for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count}`);
  }
  console.log("");
  console.log("Principais motivos de reprovação no Publication Gate:");
  if (rejectionReasons.size === 0) {
    console.log("  (nenhuma reprovação — tudo que foi avaliado passou no gate)");
  } else {
    for (const [reason, count] of [...rejectionReasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x — ${reason}`);
    }
  }
  console.log("");
  console.log(`CanonicalProduct ML com publicSlug já gerado: ${mlWithPublicSlug} / ${mlCanonicals.length}`);
  console.log(`MerchantListing Shopee com slug já gerado: ${shopeeWithSlug} / ${shopeeListings.length}`);
  console.log("");
  console.log(`URLs que entrariam no sitemap agora mesmo: ${sitemapUrls.length}`);
  console.log("");
  console.log(
    "Nota: listings sem slug ainda geram 0 no sitemap até a primeira visita " +
      "(geração lazy) ou até rodar `npx tsx scripts/backfill-public-slugs.ts`.",
  );
}

main()
  .catch((error) => {
    console.error("Falha ao gerar o relatório de SEO readiness:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

async function main() {
  const [mlCanonicals, shopeeListings] = await Promise.all([
    prisma.canonicalProduct.findMany({
      where: { listings: { some: { merchant: { code: "MERCADO_LIVRE" } } } },
      select: { id: true, slug: true, publicSlug: true },
    }),
    prisma.merchantListing.findMany({
      where: { active: true, merchant: { code: "SHOPEE" } },
      select: { id: true, slug: true },
    }),
  ]);

  let publicableOpportunities = 0;
  let indexableProductPages = 0;
  let noindexOpportunities = 0;
  let activeCtas = 0;
  let pagesWithoutCta = 0;
  let mlWithPublicSlug = 0;
  let shopeeWithSlug = 0;

  for (const canonical of mlCanonicals) {
    // Falls back to the internal ml-catalog-<id> slug when publicSlug
    // hasn't been generated yet — same OR lookup loadPublicMerchantProduct
    // itself uses, so this never undercounts a canonical just because the
    // pretty slug isn't warmed yet.
    const resolved = await loadMerchantListingFactsByPublicSlug(canonical.publicSlug ?? canonical.slug);
    if (!resolved) continue; // No catalog row (only offer rows) or unresolved — not a publicable unit.
    publicableOpportunities += 1;
    if (canonical.publicSlug) mlWithPublicSlug += 1;
    const gate = evaluatePublicationGate(resolved.facts);
    if (gate.indexable) indexableProductPages += 1;
    else noindexOpportunities += 1;
    if (gate.ctaEligible) activeCtas += 1;
    else pagesWithoutCta += 1;
  }

  for (const listing of shopeeListings) {
    const facts = await loadMerchantListingFactsByListingId(listing.id);
    if (!facts) continue;
    publicableOpportunities += 1;
    if (listing.slug) shopeeWithSlug += 1;
    const gate = evaluatePublicationGate(facts);
    if (gate.indexable) indexableProductPages += 1;
    else noindexOpportunities += 1;
    if (gate.ctaEligible) activeCtas += 1;
    else pagesWithoutCta += 1;
  }

  const sitemapUrls = await listIndexableMerchantProductUrls();

  console.log("SEO READINESS — Mercado Livre / Shopee (Acquisition Engine)");
  console.log("");
  console.log(`Opportunities avaliadas (ML catálogo + Shopee ativos): ${publicableOpportunities}`);
  console.log(`  Indexable (passam no Publication Gate): ${indexableProductPages}`);
  console.log(`  Noindex (não passam no gate ainda): ${noindexOpportunities}`);
  console.log(`  Com CTA ativo (AffiliateLinkRegistry ACTIVE): ${activeCtas}`);
  console.log(`  Sem CTA (sem link afiliado ativo): ${pagesWithoutCta}`);
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

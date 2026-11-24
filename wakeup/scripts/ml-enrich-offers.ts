/**
 * Phase 2 — commercial enrichment for the Mercado Livre catalog products
 * already detected by scripts/ml-demand-e2e-check.ts. Answers "which real
 * seller offer of this in-demand product should we generate an affiliate
 * link for?" instead of leaving the operator to investigate manually.
 *
 * Real API calls only, confirmed live 2026-09-07 (see
 * docs/MONETIZATION_SCORE.md's capability matrix):
 *   GET /products/{id}            -> brand/model/GTIN/images
 *   GET /products/{id}/items      -> real seller offers (API-native
 *                                     association, not inferred)
 *   GET /users/{sellerId}         -> real seller reputation
 *
 * Deliberately NOT called: GET /items/{id} and GET /reviews/item/{id} —
 * both return 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES for other sellers'
 * items with this app's current DevCenter permissions. sold_quantity and
 * rating stay UNKNOWN; never guessed.
 *
 * IMPORTANT — no verified public permalink exists (investigated 2026-09-07,
 * urgent correction after a real productUrl bug — see git log for the full
 * matrix). Every candidate was tested for real and rejected:
 *   - GET /items/{id} (single, multiget, field-restricted, unauthenticated)
 *     -> 403 for every variant tried.
 *   - GET /products/{id}'s own `permalink` and every `pickers[].permalink`
 *     -> always "" (empty) across 5 different real catalog products.
 *   - `buy_box_winner` -> always null across the same 5 products.
 *   - GET /sites/{site}/search (keyword or catalog_product_id) -> 403.
 * MERCHANTLISTING.PRODUCTURL IS THEREFORE NOT A CONFIRMED NAVIGABLE LINK —
 * it's a best-effort reference built from the real item_id on Mercado
 * Livre's own produto.mercadolivre.com.br redirector domain (not a guessed
 * slug/path), kept only because the schema requires a non-null URL and an
 * item-specific reference beats a generic one. Every offer's
 * MerchantListingSignal.raw carries `permalinkVerified: false` so nothing
 * downstream (queue, admin UI, tests) is allowed to present it as a
 * confirmed link — the operator's real, working path stays the official
 * Mercado Livre affiliate portal search (unchanged since Phase 1).
 *
 * Manual, human-run — not wired into jobs/ (same category as
 * scripts/shopee-first-cycle.ts and scripts/ml-demand-e2e-check.ts). See
 * jobs/ml-enrichment.ts (Automação Operacional V1, 2026-09-08) for the
 * automated counterpart — same shared logic
 * (lib/services/ml-enrichment-collector.ts), same idempotent upserts, plus
 * locking/retry/partial-failure isolation this manual script doesn't need.
 * Idempotent: MerchantListing/CanonicalProduct rows are upserted by a
 * deterministic key; reruns don't duplicate them (MerchantListingSignal
 * rows do accumulate over time by design, same convention as the other
 * two scripts — latest wins via observedAt desc).
 *
 * Usage: npx tsx scripts/ml-enrich-offers.ts
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";

async function main() {
  if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED || !env.MERCADO_LIVRE_ACCESS_TOKEN) {
    console.error(
      "MERCADO_LIVRE_ENABLED, MERCADO_LIVRE_API_ENABLED and MERCADO_LIVRE_ACCESS_TOKEN must all be set.",
    );
    process.exitCode = 1;
    return;
  }

  // Auto-refreshing token (lib/services/ml-token-store.ts) — the static
  // env token expires ~6h after OAuth issuance, and this script's real
  // runs (181 offers, dozens of sequential API calls) can genuinely take
  // long enough to matter.
  const provider = await createMercadoLivreProvider();
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });

  // Catalog-level listings: the demand rows scripts/ml-demand-e2e-check.ts
  // already persisted (externalId = catalog_product_id). Real seller
  // offers get their own, separate MerchantListing rows below — never
  // overwriting these.
  const catalogListings = await prisma.merchantListing.findMany({
    where: {
      merchantId: merchant.id,
      signals: { some: { source: { in: ["mercado_livre_highlights", "mercado_livre_trends"] } } },
    },
    include: { monetizationScore: true },
  });

  console.log(`${catalogListings.length} catalog product(s) para enriquecer.`);

  const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
  let offersCreated = 0;

  for (const catalogListing of catalogListings) {
    const catalogDemandScore = catalogListing.monetizationScore?.score ?? 50;
    const result = await enrichCatalogListing(
      provider,
      merchant.id,
      catalogListing,
      catalogDemandScore,
      sellerCache,
    );
    if (!result) {
      console.log(`  ${catalogListing.externalId}: catalog product não encontrado (404) — pulando.`);
      continue;
    }
    console.log(`  ${catalogListing.externalId}: ${result.offersProcessed} oferta(s) real(is).`);
    offersCreated += result.offersCreated + result.offersUpdated;
  }

  console.log(`\nResumo: ${catalogListings.length} produto(s) processado(s), ${offersCreated} oferta(s) real(is) enriquecida(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

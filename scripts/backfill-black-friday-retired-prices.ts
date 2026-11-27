import { prisma } from "@/lib/db";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";

/**
 * 2026-11-27: scripts/register-black-friday-retired.ts registered 39 of
 * the 45 products, but its enrichCatalogListing step throws on every one
 * of them (MercadoLivreProvider.getCatalogProductItems -> HTTP 403 for
 * every catalogProductId tried — a live API permission issue, not
 * specific to these products), so none got the per-offer
 * "mercado_livre_catalog_items" signal real enrichment writes. Without
 * it, getUnifiedMerchantOffers' own `withPrice` filter drops every one
 * of them before the /ofertas pin ever sees them — confirmed live: none
 * of the 45 catalogIds appeared on https://precocaindo.com.br/ofertas
 * after deploy.
 *
 * This creates the minimal sibling "offer" MerchantListing +
 * MerchantListingSignal(source="mercado_livre_catalog_items") each
 * catalog row needs for lib/queries/candidate-pool.ts's
 * selectBestOfferIdsPerCanonicalProduct and unified-offers.ts's mlCards
 * mapping to find a real price — using the SAME price already recorded
 * on BlackFridayProduct.advertisedPrice (Henrique's confirmed real
 * creative price), never invented.
 *
 * Usage: npx tsx scripts/backfill-black-friday-retired-prices.ts
 */
const PRICES: Record<string, number> = {
  MLB56721548: 9035.99, MLB72018722: 5439.99, MLB29001054: 4596.60,
  MLB60385574: 4439.00, MLB29699966: 3849.00, MLB61372830: 3229.90,
  MLB75681241: 2869.00, MLB76156293: 2799.00, MLB45248118: 2697.05,
  MLB64307757: 2679.38, MLB53624671: 2240.00, MLB80139594: 1869.99,
  MLB63752255: 1808.19, MLB45804798: 1647.00, MLB51757209: 1159.20,
  MLB51396300: 996.31, MLB29239223: 755.00, MLB67462015: 699.56,
  MLB77671293: 689.99, MLB24070645: 597.81, MLB46220740: 549.90,
  MLB66518584: 479.90, MLB50269368: 441.60, MLB32529104: 339.14,
  MLB19635464: 323.00, MLB38224820: 302.00, MLB52162585: 278.99,
  MLB38833473: 263.12, MLB22234448: 238.90, MLB27705742: 204.76,
  MLB69742713: 199.90, MLB18218400: 150.35, MLB68039511: 140.64,
  MLB69621080: 135.90, MLB22857151: 115.10, MLB24609499: 101.08,
  MLB30890350: 64.90, MLB19508914: 59.90, MLB66699406: 44.99,
};

async function main() {
  const merchant = await ensureMercadoLivreMerchant();
  let done = 0;
  let missing = 0;
  for (const [catalogProductId, price] of Object.entries(PRICES)) {
    const catalogListing = await prisma.merchantListing.findUnique({
      where: {
        merchantId_marketplace_externalId: {
          merchantId: merchant.id,
          marketplace: "BR",
          externalId: catalogProductId,
        },
      },
      select: { id: true, canonicalProductId: true, productUrl: true },
    });
    if (!catalogListing || !catalogListing.canonicalProductId) {
      console.log(`SKIP ${catalogProductId} -> no catalog listing/canonical found`);
      missing++;
      continue;
    }
    const offerExternalId = `${catalogProductId}-offer-bf-retired`;
    const offerListing = await prisma.merchantListing.upsert({
      where: {
        merchantId_marketplace_externalId: {
          merchantId: merchant.id,
          marketplace: "BR",
          externalId: offerExternalId,
        },
      },
      create: {
        merchantId: merchant.id,
        externalId: offerExternalId,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: catalogListing.productUrl,
        canonicalProductId: catalogListing.canonicalProductId,
        source: "MANUAL_VERIFIED",
      },
      update: { canonicalProductId: catalogListing.canonicalProductId },
    });
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: offerListing.id,
        source: "mercado_livre_catalog_items",
        raw: {
          price,
          original_price: null,
          discountPercent: null,
          condition: "new",
          shipping: { free_shipping: false },
          seller: null,
          permalinkVerified: false,
          discoverySource: "BLACK_FRIDAY_RETIRED_BACKFILL",
        },
      },
    });
    console.log(`OK ${catalogProductId} -> offer ${offerListing.id} price ${price}`);
    done++;
  }
  console.log(`\n${done} preenchidos, ${missing} sem catálogo encontrado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));

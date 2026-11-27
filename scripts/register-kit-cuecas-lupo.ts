import { prisma } from "@/lib/db";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";
import { saveManualAffiliateLinkFromCategoryQueue } from "@/lib/services/affiliate-link-registry";

/**
 * 2026-11-27: the 45th/last missing Black Friday product. Its original
 * link (produto.mercadolivre.com.br/MLB-4824049721-...) uses the
 * "produto.mercadolivre.com.br/MLB-xxxx-slug" URL shape, which
 * extractCatalogProductId (lib/services/ml-panel-register.ts) doesn't
 * match (it only looks for /p/MLB or %2Fp%2FMLB) — registerPanelPick
 * correctly refused it ("não consegui identificar o produto"). The real
 * catalog id is already known directly from that URL, so this creates
 * the MerchantListing/CanonicalProduct/affiliate link/price signal by
 * hand instead of through resolution, same end state as
 * register-black-friday-retired.ts + backfill-black-friday-retired-
 * prices.ts for the other 39.
 *
 * Usage: npx tsx scripts/register-kit-cuecas-lupo.ts
 */
const EXTERNAL_ID = "MLB-4824049721";
const TITLE = "Kit 6 Cuecas Boxer Lupo Algodão Lisa Cor Única Premium";
const PRODUCT_URL =
  "https://produto.mercadolivre.com.br/MLB-4824049721-kit-6-cuecas-boxer-lupo-algodo-lisa-cor-unica-premium-_JM";
const AFFILIATE_URL = "https://meli.la/27utPmB";
const PRICE = 176.61;

async function main() {
  const merchant = await ensureMercadoLivreMerchant();

  const canonical = await prisma.canonicalProduct.upsert({
    where: { slug: `ml-catalog-${EXTERNAL_ID}` },
    create: { slug: `ml-catalog-${EXTERNAL_ID}`, title: TITLE, specifications: { catalogProductId: EXTERNAL_ID } },
    update: {},
  });

  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: EXTERNAL_ID,
      },
    },
    create: {
      merchantId: merchant.id,
      externalId: EXTERNAL_ID,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: PRODUCT_URL,
      canonicalProductId: canonical.id,
      source: "MANUAL_VERIFIED",
    },
    update: { canonicalProductId: canonical.id },
  });

  await saveManualAffiliateLinkFromCategoryQueue({
    merchantListingId: listing.id,
    merchantId: merchant.id,
    merchantCode: "MERCADO_LIVRE",
    publicUrl: listing.productUrl,
    affiliateUrl: AFFILIATE_URL,
  });

  const offerListing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: `${EXTERNAL_ID}-offer-bf-retired`,
      },
    },
    create: {
      merchantId: merchant.id,
      externalId: `${EXTERNAL_ID}-offer-bf-retired`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: PRODUCT_URL,
      canonicalProductId: canonical.id,
      source: "MANUAL_VERIFIED",
    },
    update: { canonicalProductId: canonical.id },
  });
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: offerListing.id,
      source: "mercado_livre_catalog_items",
      raw: {
        price: PRICE,
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

  console.log(`OK ${EXTERNAL_ID} registered, listing ${listing.id}, offer ${offerListing.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));

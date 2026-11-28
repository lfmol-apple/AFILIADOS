import { ShopeeProvider } from "@/lib/providers/shopee-provider";
import { buildShopeeSubIds } from "@/lib/services/shopee-attribution";

/**
 * Owner's authorization, 2026-11-28: generate ONE real Shopee affiliate
 * link for the plain Shopee homepage, using the official
 * generateShortLink mutation this project already uses for per-product
 * links (lib/providers/shopee-provider.ts) — same mechanism, just a
 * different originUrl. Never a fabricated link.
 *
 * Usage (inside a container with real Shopee credentials):
 *   npx tsx scripts/generate-shopee-homepage-link.ts
 */
async function main() {
  const provider = new ShopeeProvider();
  // Same buildShopeeSubIds helper every real per-product link already uses
  // (lib/services/shopee-cycle-collector.ts) — the pre-registered
  // SHOPEE_SUB_ID1 is what Shopee's API actually accepts; a free-text subId
  // was rejected ("invalid sub id").
  const subIds = buildShopeeSubIds({ source: "v2_home" });
  const link = await provider.generateAffiliateLink("https://shopee.com.br", subIds);
  console.log("SHOPEE_HOMEPAGE_LINK=" + link);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));

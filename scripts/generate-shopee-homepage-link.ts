import { ShopeeProvider } from "@/lib/providers/shopee-provider";

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
  const link = await provider.generateAffiliateLink("https://shopee.com.br", ["precocaindo_v2_home"]);
  console.log("SHOPEE_HOMEPAGE_LINK=" + link);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));

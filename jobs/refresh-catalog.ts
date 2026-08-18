import { runJob, mergeJobCounters, type JobCounters } from "@/lib/jobs/automation-run";
import { refreshProductsByPriority } from "@/lib/jobs/refresh-products";
import { getEnabledMarketplaces } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

async function refreshCatalogForMarketplace(marketplace: MarketplaceCode): Promise<JobCounters> {
  return runJob(
    "REFRESH_CATALOG",
    async (ctx) => {
      await refreshProductsByPriority(marketplace, ["WARM", "COLD"], 200, ctx);
    },
    { marketplace },
  );
}

/** Refreshes WARM/COLD products at a slower pace, batched to respect
 * upstream rate limits, for every enabled marketplace. Only BR is enabled
 * today. Run less frequently than REFRESH_PRIORITY_PRODUCTS. See
 * docs/AUTOMATION.md. */
export async function refreshCatalog(): Promise<JobCounters> {
  const results: JobCounters[] = [];
  for (const marketplace of getEnabledMarketplaces()) {
    results.push(await refreshCatalogForMarketplace(marketplace));
  }
  return mergeJobCounters(results);
}

import { runJob, mergeJobCounters, type JobCounters } from "@/lib/jobs/automation-run";
import { refreshProductsByPriority } from "@/lib/jobs/refresh-products";
import { getEnabledMarketplaces } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

async function refreshPriorityForMarketplace(marketplace: MarketplaceCode): Promise<JobCounters> {
  return runJob(
    "REFRESH_PRIORITY_PRODUCTS",
    async (ctx) => {
      await refreshProductsByPriority(marketplace, ["HOT"], 100, ctx);
    },
    { marketplace },
  );
}

/** Refreshes HOT products (high traffic / high opportunity) for every
 * enabled marketplace — should run most frequently of the two refresh
 * jobs. Only BR is enabled today. See docs/AUTOMATION.md. */
export async function refreshPriorityProducts(): Promise<JobCounters> {
  const results: JobCounters[] = [];
  for (const marketplace of getEnabledMarketplaces()) {
    results.push(await refreshPriorityForMarketplace(marketplace));
  }
  return mergeJobCounters(results);
}

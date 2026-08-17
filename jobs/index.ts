import { discoverProducts } from "./discover-products";
import { refreshPriorityProducts } from "./refresh-priority-products";
import { refreshCatalog } from "./refresh-catalog";
import { calculatePriceStatsJob } from "./calculate-price-stats";
import { calculateOpportunities } from "./calculate-opportunities";
import { discoverContentOpportunities } from "./discover-content-opportunities";
import { generateContent } from "./generate-content";
import { validateContent } from "./validate-content";
import { publishContent } from "./publish-content";
import { refreshSitemaps } from "./refresh-sitemaps";
import { markStaleContent } from "./mark-stale-content";
import { cleanup } from "./cleanup";

/** Every job name the scheduler knows about, in the order they'd typically
 * run in a full daily cycle (project brief section 17). Not tied to any
 * particular hosting provider's cron — see docs/AUTOMATION.md for how to
 * wire this to GitHub Actions, a VPS crontab, or a queue. */
export const JOBS = {
  DISCOVER_PRODUCTS: discoverProducts,
  REFRESH_PRIORITY_PRODUCTS: refreshPriorityProducts,
  REFRESH_CATALOG: refreshCatalog,
  CALCULATE_PRICE_STATS: calculatePriceStatsJob,
  CALCULATE_OPPORTUNITIES: calculateOpportunities,
  DISCOVER_CONTENT_OPPORTUNITIES: discoverContentOpportunities,
  GENERATE_CONTENT: generateContent,
  VALIDATE_CONTENT: validateContent,
  PUBLISH_CONTENT: publishContent,
  REFRESH_SITEMAPS: refreshSitemaps,
  MARK_STALE_CONTENT: markStaleContent,
  CLEANUP: cleanup,
} as const;

export type JobName = keyof typeof JOBS;

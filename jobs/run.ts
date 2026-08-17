import "dotenv/config";
import { JOBS, type JobName } from "./index";

const ALL_JOBS_IN_ORDER: JobName[] = [
  "DISCOVER_PRODUCTS",
  "REFRESH_PRIORITY_PRODUCTS",
  "REFRESH_CATALOG",
  "CALCULATE_PRICE_STATS",
  "CALCULATE_OPPORTUNITIES",
  "DISCOVER_CONTENT_OPPORTUNITIES",
  "GENERATE_CONTENT",
  "VALIDATE_CONTENT",
  "PUBLISH_CONTENT",
  "REFRESH_SITEMAPS",
  "MARK_STALE_CONTENT",
  "CLEANUP",
];

async function main() {
  const arg = process.argv[2];

  const jobNames: JobName[] = arg === undefined || arg === "ALL" ? ALL_JOBS_IN_ORDER : [arg as JobName];

  for (const name of jobNames) {
    const job = JOBS[name];
    if (!job) {
      console.error(`Unknown job: ${name}. Known jobs: ${Object.keys(JOBS).join(", ")}`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n> Running ${name}...`);
    try {
      const counters = await job();
      console.log(`  done: ${JSON.stringify(counters)}`);
    } catch (err) {
      console.error(`  failed: ${err}`);
      process.exitCode = 1;
    }
  }
}

main().finally(() => process.exit());

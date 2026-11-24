import { prisma } from "@/lib/db";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { runProductMatcherShadow } from "@/lib/services/product-match-shadow";

/**
 * PRODUCT_MATCHER_SHADOW (2026-09-08) — runs lib/services/
 * product-match-shadow.ts under the same runJob() locking/AutomationRun
 * observability every other job in this codebase uses. Never calls an
 * external API (pure DB read + in-memory matching + DB write), so this
 * job has no retry/backoff of its own — nothing here is a transient
 * network failure to retry; a thrown error here is a real bug or a
 * genuine data problem, and should surface immediately as FAILED.
 *
 * Failure isolation (project brief section 16, explicit): if this job
 * throws, runJob() records it as FAILED and rethrows — the caller
 * (jobs/run-ml-shopee-cycle.ts) catches that at the cycle-step level and
 * moves on, exactly like ML_DEMAND/ML_ENRICHMENT/SHOPEE_REFRESH already
 * do. This job's failure can never undo or corrupt what those three
 * already persisted this cycle — it only reads their output, never
 * writes back to MerchantListing/MerchantListingSignal/MonetizationScore.
 */
export async function runProductMatcherShadowJob(): Promise<JobCounters> {
  return runJob("PRODUCT_MATCHER_SHADOW", async (ctx) => {
    const result = await runProductMatcherShadow();

    ctx.counters.processed = result.eligibleListings;
    ctx.counters.created = result.evidenceProduced;
    ctx.counters.updated = 0;
    // Not an error in the runJob() sense — a candidate pair with no
    // match is a correct, expected outcome, not a failure. Tracked in
    // metadata for observability instead of ctx.counters.errors.
    ctx.metadata.mlRepresentatives = result.eligibleMlRepresentatives;
    ctx.metadata.shopeeListings = result.eligibleShopeeListings;
    ctx.metadata.candidatePairsConsidered = result.candidatePairsConsidered;
    ctx.metadata.confirmed = result.confirmed;
    ctx.metadata.candidate = result.candidate;
    ctx.metadata.crossMerchant = result.crossMerchant;
    ctx.metadata.intraMerchant = result.intraMerchant;
    ctx.metadata.noMatch = result.noMatch;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runProductMatcherShadowJob()
    .then((counters) => {
      console.log("PRODUCT_MATCHER_SHADOW done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("PRODUCT_MATCHER_SHADOW failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

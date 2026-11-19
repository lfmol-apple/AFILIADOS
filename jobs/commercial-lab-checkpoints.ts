import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { runDueCheckpoints } from "@/lib/services/commercial-intelligence/lab/checkpoints";

/** Daily — resolves any Commercial Intelligence Lab checkpoint whose
 * dueAt has passed. A no-op most days (checkpoints are 7-90 days apart);
 * never backfills, never runs early. */
export async function runCommercialLabCheckpointsJob() {
  return runJob("COMMERCIAL_LAB_CHECKPOINTS", async (ctx) => {
    const { resolved, skipped } = await runDueCheckpoints();
    ctx.counters.processed = resolved + skipped;
    ctx.counters.updated = resolved;
    ctx.metadata.resolved = resolved;
    ctx.metadata.stillPending = skipped;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runCommercialLabCheckpointsJob()
    .then((counters) => console.log("COMMERCIAL_LAB_CHECKPOINTS done:", JSON.stringify(counters)))
    .catch((err) => {
      console.error("COMMERCIAL_LAB_CHECKPOINTS failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

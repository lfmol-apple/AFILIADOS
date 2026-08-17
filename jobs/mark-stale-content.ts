import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";

const STALE_AFTER_DAYS = 60;

/** Marks PUBLISHED content as STALE once it hasn't been regenerated in a
 * while, so it can be prioritized for a refresh instead of silently
 * drifting out of date. Does not unpublish anything. */
export async function markStaleContent() {
  return runJob("MARK_STALE_CONTENT", async (ctx) => {
    const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    const result = await prisma.generatedContent.updateMany({
      where: { status: "PUBLISHED", updatedAt: { lt: cutoff } },
      data: { status: "STALE" },
    });

    ctx.counters.processed = result.count;
    ctx.counters.updated = result.count;
  });
}

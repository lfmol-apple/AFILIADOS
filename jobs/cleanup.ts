import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";

const AUTOMATION_RUN_RETENTION_DAYS = 90;
const REJECTED_CONTENT_RETENTION_DAYS = 30;

/** Safe, narrowly-scoped housekeeping: old AutomationRun logs and long-dead
 * REJECTED content drafts. Never touches Product, Offer, PriceHistory, or
 * anything published. */
export async function cleanup() {
  return runJob("CLEANUP", async (ctx) => {
    const runsCutoff = new Date(Date.now() - AUTOMATION_RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deletedRuns = await prisma.automationRun.deleteMany({
      where: { startedAt: { lt: runsCutoff }, status: { in: ["SUCCESS", "FAILED", "PARTIAL"] } },
    });

    const contentCutoff = new Date(
      Date.now() - REJECTED_CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletedContent = await prisma.generatedContent.deleteMany({
      where: { status: "REJECTED", updatedAt: { lt: contentCutoff } },
    });

    ctx.counters.processed = deletedRuns.count + deletedContent.count;
    ctx.counters.updated = deletedRuns.count + deletedContent.count;
    ctx.metadata.deletedAutomationRuns = deletedRuns.count;
    ctx.metadata.deletedRejectedContent = deletedContent.count;
  });
}

import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { featureFlags } from "@/lib/config/site";

/**
 * Publishes APPROVED content — but only when AUTO_PUBLISH=true. With the
 * default AUTO_PUBLISH=false (project brief section 33), this job counts
 * what *would* be published so the admin dashboard can show a backlog, but
 * makes no status changes. Never bypasses the ContentQualityGate verdict.
 */
export async function publishContent() {
  return runJob("PUBLISH_CONTENT", async (ctx) => {
    const approved = await prisma.generatedContent.findMany({
      where: { status: "APPROVED" },
    });

    ctx.counters.processed = approved.length;

    if (!featureFlags.autoPublish) {
      ctx.metadata.skipped = "AUTO_PUBLISH=false";
      ctx.metadata.eligibleForPublish = approved.length;
      return;
    }

    for (const content of approved) {
      await prisma.generatedContent.update({
        where: { id: content.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      ctx.counters.updated += 1;
    }
  });
}

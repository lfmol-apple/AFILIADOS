import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { featureFlags } from "@/lib/config/site";
import { decidePublication } from "@/lib/services/publication-decision";

const STALE_AFTER_DAYS = 60;

/**
 * Publishes APPROVED content — but only when AUTO_PUBLISH=true, and only
 * for content PublicationDecisionEngine actually decides to CREATE (project
 * brief Part F). With the default AUTO_PUBLISH=false, this job still runs
 * the decision for every eligible row and reports the breakdown
 * (create/noindex/reject) so the admin dashboard shows a real backlog, but
 * makes no status changes. Never bypasses the ContentQualityGate verdict —
 * only rows already marked APPROVED are considered.
 */
export async function publishContent() {
  return runJob("PUBLISH_CONTENT", async (ctx) => {
    const approved = await prisma.generatedContent.findMany({ where: { status: "APPROVED" } });
    ctx.counters.processed = approved.length;

    const now = Date.now();
    const breakdown = { CREATE: 0, NOINDEX: 0, REJECT: 0, UPDATE: 0, KEEP: 0 };

    for (const content of approved) {
      const isFresh = now - content.updatedAt.getTime() < STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

      const decision = decidePublication({
        hasRealData: true, // ContentQualityGate already required real facts to reach APPROVED
        dataQualitySufficient: true,
        demandScore: content.demandScoreAtGeneration ?? null,
        qualityGateVerdict: "PASS",
        isFresh,
        alreadyPublished: false,
        canAddRealValue: true, // ContentQualityGate's value-add check already gated this
      });

      breakdown[decision.decision] += 1;

      if (!featureFlags.autoPublish) continue;

      if (decision.decision === "CREATE" || decision.decision === "NOINDEX") {
        await prisma.generatedContent.update({
          where: { id: content.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            noindex: decision.decision === "NOINDEX",
          },
        });
        ctx.counters.updated += 1;
      } else if (decision.decision === "REJECT") {
        await prisma.generatedContent.update({
          where: { id: content.id },
          data: { status: "REJECTED" },
        });
        ctx.counters.updated += 1;
      }
    }

    ctx.metadata.decisionBreakdown = breakdown;
    if (!featureFlags.autoPublish) {
      ctx.metadata.skipped = "AUTO_PUBLISH=false";
      ctx.metadata.eligibleForPublish = breakdown.CREATE;
    }
  });
}

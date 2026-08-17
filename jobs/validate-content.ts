import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { evaluateContentQuality } from "@/lib/services/content-quality-gate";
import type { Prisma } from "@prisma/client";

const BATCH_SIZE = 50;

/** Runs the ContentQualityGate over DRAFT content and moves it to
 * APPROVED / VALIDATING (needs human review) / REJECTED accordingly. Never
 * publishes anything itself — that's PUBLISH_CONTENT's job, gated
 * separately by AUTO_PUBLISH. */
export async function validateContent() {
  return runJob("VALIDATE_CONTENT", async (ctx) => {
    const drafts = await prisma.generatedContent.findMany({
      where: { status: "DRAFT" },
      take: BATCH_SIZE,
    });

    for (const draft of drafts) {
      ctx.counters.processed += 1;

      let sourceDescriptionLength: number | undefined;
      if (draft.contentType === "PRODUCT" && draft.entityId) {
        const product = await prisma.product.findUnique({
          where: { id: draft.entityId },
          select: { title: true, description: true },
        });
        if (product) {
          sourceDescriptionLength =
            product.title.length + (product.description?.length ?? 0);
        }
      }

      const result = evaluateContentQuality({
        title: draft.title,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        body: draft.body,
        sourceDescriptionLength,
      });

      const status =
        result.verdict === "PASS"
          ? "APPROVED"
          : result.verdict === "REVIEW"
            ? "VALIDATING"
            : "REJECTED";

      await prisma.generatedContent.update({
        where: { id: draft.id },
        data: {
          status,
          qualityScore: result.qualityScore,
          qualityReasons: result.reasons as unknown as Prisma.InputJsonValue,
          reviewedAt: new Date(),
        },
      });
      ctx.counters.updated += 1;
    }
  });
}

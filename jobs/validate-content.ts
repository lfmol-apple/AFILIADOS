import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { evaluateContentQuality } from "@/lib/services/content-quality-gate";
import { maxSimilarityAgainstCorpus } from "@/lib/services/similarity";
import type { Prisma } from "@prisma/client";

const BATCH_SIZE = 50;

function countRealFacts(product: {
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  brand: string | null;
  specifications: unknown;
}): number {
  let count = 0;
  if (product.description) count += 1;
  if (product.rating !== null) count += 1;
  if (product.reviewCount !== null) count += 1;
  if (product.brand) count += 1;
  if (product.specifications && typeof product.specifications === "object") {
    count += Object.keys(product.specifications as Record<string, unknown>).length;
  }
  return count;
}

/** Runs the ContentQualityGate over DRAFT content and moves it to
 * APPROVED / VALIDATING (needs human review) / REJECTED accordingly. Never
 * publishes anything itself — that's PUBLISH_CONTENT's job, gated
 * separately by AUTO_PUBLISH and PublicationDecisionEngine. Also checks
 * duplication risk against already-published content of the same type
 * (project brief Part G: scaled content abuse protection). */
export async function validateContent() {
  return runJob("VALIDATE_CONTENT", async (ctx) => {
    const drafts = await prisma.generatedContent.findMany({
      where: { status: "DRAFT" },
      take: BATCH_SIZE,
    });

    for (const draft of drafts) {
      ctx.counters.processed += 1;

      let sourceDescriptionLength: number | undefined;
      let sourceFactCount: number | undefined;
      if (draft.contentType === "PRODUCT" && draft.entityId) {
        const product = await prisma.product.findUnique({
          where: { id: draft.entityId },
          select: {
            title: true,
            description: true,
            rating: true,
            reviewCount: true,
            brand: true,
            specifications: true,
          },
        });
        if (product) {
          sourceDescriptionLength = product.title.length + (product.description?.length ?? 0);
          sourceFactCount = countRealFacts(product);
        }
      }

      const publishedCorpus = await prisma.generatedContent.findMany({
        where: { contentType: draft.contentType, status: "PUBLISHED", id: { not: draft.id } },
        select: { body: true },
        take: 200,
      });
      const similarityToExistingContent = maxSimilarityAgainstCorpus(
        draft.body,
        publishedCorpus.map((c) => c.body),
      );

      const result = evaluateContentQuality({
        title: draft.title,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        body: draft.body,
        sourceDescriptionLength,
        sourceFactCount,
        similarityToExistingContent,
      });

      const status =
        result.verdict === "PASS" ? "APPROVED" : result.verdict === "REVIEW" ? "VALIDATING" : "REJECTED";

      await prisma.generatedContent.update({
        where: { id: draft.id },
        data: {
          status,
          qualityScore: result.qualityScore,
          qualityReasons: result.reasons as unknown as Prisma.InputJsonValue,
          qualityBreakdown: result.dimensions as unknown as Prisma.InputJsonValue,
          reviewedAt: new Date(),
        },
      });
      ctx.counters.updated += 1;
    }
  });
}

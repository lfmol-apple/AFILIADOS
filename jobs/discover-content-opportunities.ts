import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";

/**
 * Finds products that deserve a review page but don't have one yet (or in
 * progress), and queues them as SearchOpportunity rows for GENERATE_CONTENT.
 * Priority favors higher Opportunity Score, since those pages are more
 * likely to convert traffic into a qualified click.
 */
export async function discoverContentOpportunities() {
  return runJob("DISCOVER_CONTENT_OPPORTUNITIES", async (ctx) => {
    const existingContentEntityIds = await prisma.generatedContent.findMany({
      where: { contentType: "PRODUCT" },
      select: { entityId: true },
    });
    const excludedIds = new Set(
      existingContentEntityIds.map((c) => c.entityId).filter(Boolean),
    );

    const candidates = await prisma.product.findMany({
      where: {
        active: true,
        opportunityScore: { isNot: null },
        searchOpportunities: {
          none: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        },
      },
      include: { opportunityScore: true },
    });

    for (const product of candidates) {
      if (excludedIds.has(product.id)) continue;
      ctx.counters.processed += 1;
      await prisma.searchOpportunity.create({
        data: {
          keyword: product.title,
          intent: "product_review",
          productId: product.id,
          priority: product.opportunityScore?.score ?? 0,
          status: "PENDING",
        },
      });
      ctx.counters.created += 1;
    }
  });
}

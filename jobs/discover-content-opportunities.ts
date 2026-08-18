import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { evaluateDemand } from "@/lib/demand/scoring";
import { normalizeKeyword } from "@/lib/demand/normalize";

/**
 * Finds products that deserve a review page but don't have one yet (or in
 * progress), and queues them as SearchOpportunity rows scored by
 * DemandEngine — see lib/demand/scoring.ts and docs/DEMAND_ENGINE.md. This
 * only handles PRODUCT-type candidates tied to a single catalog item;
 * category/keyword-level opportunities with no specific product go through
 * lib/demand/index.ts's collectDemandCandidates() directly when a future
 * job needs them.
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
      select: {
        id: true,
        title: true,
        opportunityScore: { select: { score: true } },
        priceStats: { select: { coverageDays: true } },
      },
    });

    for (const product of candidates) {
      if (excludedIds.has(product.id)) continue;
      ctx.counters.processed += 1;

      const evaluation = evaluateDemand({
        // No internal-search tie-in per product yet — SearchEvent isn't
        // joined to a specific product at query time here. Real observed
        // demand still flows in separately via InternalDemandSource for
        // keyword-level candidates (lib/demand/index.ts).
        observedCount: 0,
        hasExistingPublishedContent: false,
        relatedOpportunityScore: product.opportunityScore?.score ?? null,
        dataCoverageDays: product.priceStats?.coverageDays ?? null,
      });

      await prisma.searchOpportunity.create({
        data: {
          keyword: product.title,
          normalizedKeyword: normalizeKeyword(product.title),
          intent: "PRODUCT_RESEARCH",
          source: "product_catalog",
          productId: product.id,
          demandScore: evaluation.demandScore,
          commercialScore: evaluation.commercialScore,
          freshnessScore: evaluation.freshnessScore,
          contentGapScore: evaluation.contentGapScore,
          overallScore: evaluation.overallScore,
          priority: Math.round(evaluation.overallScore),
          status: "PENDING",
          lastEvaluatedAt: new Date(),
        },
      });
      ctx.counters.created += 1;
    }
  });
}

import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { decideProductPriority } from "@/lib/services/product-priority";
import { PRIORITY_THRESHOLDS } from "@/lib/config/priority";

/**
 * Recomputes HOT/WARM/COLD for every active product from real signals
 * (score, price drop, availability, recent clicks) — see
 * lib/services/product-priority.ts. Complements the immediate HOT
 * promotion CALCULATE_OPPORTUNITIES already does on a fresh price drop:
 * this job is what *demotes* products whose signals have gone quiet.
 *
 * Recommended frequency: once daily is enough — the staleness windows in
 * lib/config/priority.ts are measured in days, so running this more often
 * than that has no effect beyond wasted DB reads (see docs/AUTOMATION.md).
 */
export async function rebalanceProductPriorities() {
  return runJob(
    "REBALANCE_PRODUCT_PRIORITIES",
    async (ctx) => {
      const since = new Date(
        Date.now() - PRIORITY_THRESHOLDS.clicksWindowDays * 24 * 60 * 60 * 1000,
      );

      const products = await prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          updatePriority: true,
          priorityUpdatedAt: true,
          opportunityScore: { select: { score: true } },
          priceStats: { select: { dropPercentage: true } },
          offers: {
            orderBy: { observedAt: "desc" },
            take: 1,
            select: { availability: true },
          },
        },
      });

      for (const product of products) {
        ctx.counters.processed += 1;
        const availability = product.offers[0]?.availability ?? "UNKNOWN";

        const recentClicks = await prisma.affiliateClick.count({
          where: { productId: product.id, createdAt: { gte: since } },
        });

        const decision = decideProductPriority({
          currentPriority: product.updatePriority,
          priorityUpdatedAt: product.priorityUpdatedAt,
          opportunityScore: product.opportunityScore?.score ?? null,
          dropPercentage: product.priceStats?.dropPercentage ?? null,
          availability,
          recentClicks,
        });

        if (decision.changed) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              updatePriority: decision.priority,
              priorityUpdatedAt: new Date(),
            },
          });
          ctx.counters.updated += 1;
        }
      }
    },
    { marketplace: "BR" },
  );
}

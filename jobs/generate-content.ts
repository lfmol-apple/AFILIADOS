import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { getContentProvider } from "@/lib/content";
import { contentHash } from "@/lib/services/similarity";
import type { VerifiedFacts } from "@/types/content";

const PROMPT_VERSION = "product-review-v1";
const BATCH_SIZE = 20;

function buildVerifiedFacts(product: {
  title: string;
  brand: string | null;
  description: string | null;
  specifications: unknown;
  rating: number | null;
  reviewCount: number | null;
  category: { name: string } | null;
  offers: { price: unknown; currency: string; discountPercentage: number | null }[];
  priceStats: {
    lowestPrice: unknown;
    highestPrice: unknown;
    avg30d: unknown;
    coverageDays: number;
  } | null;
  opportunityScore: { score: number } | null;
}): VerifiedFacts | null {
  const offer = product.offers[0];
  if (!offer) return null;

  return {
    facts: {
      title: product.title,
      brand: product.brand ?? undefined,
      categoryName: product.category?.name,
      description: product.description ?? undefined,
      specifications: (product.specifications as Record<string, string | number | boolean>) ?? undefined,
      rating: product.rating ?? undefined,
      reviewCount: product.reviewCount ?? undefined,
      currency: offer.currency,
    },
    calculations: {
      currentPrice: Number(offer.price),
      discountPercentage: offer.discountPercentage ?? undefined,
      lowestPrice: product.priceStats ? Number(product.priceStats.lowestPrice) : undefined,
      highestPrice: product.priceStats ? Number(product.priceStats.highestPrice) : undefined,
      avg30d: product.priceStats?.avg30d ? Number(product.priceStats.avg30d) : undefined,
      coverageDays: product.priceStats?.coverageDays ?? 0,
      opportunityScore: product.opportunityScore?.score,
    },
    editorial: {
      tone: "direto, sem hype, em português do Brasil",
      requiredSections: [
        "O preço está bom?",
        "Para quem faz sentido",
        "Pontos fortes",
        "Pontos de atenção",
        "Metodologia",
      ],
      disclosures: [
        "O Score é calculado pelo PreçoCaindo, não é uma recomendação da Amazon.",
      ],
    },
  };
}

/**
 * Generates DRAFT GeneratedContent rows for the highest-priority pending
 * SearchOpportunity entries. A no-op when CONTENT_GENERATION=off (project
 * brief section 33) — that is a valid, expected state, not a failure. The
 * provider only ever receives a VerifiedFacts envelope (facts/calculations/
 * editorial) — see types/content.ts and docs/CONTENT_ENGINE.md.
 */
export async function generateContent() {
  return runJob("GENERATE_CONTENT", async (ctx) => {
    const provider = getContentProvider();
    if (!provider) {
      ctx.metadata.skipped = "CONTENT_GENERATION=off";
      return;
    }

    const opportunities = await prisma.searchOpportunity.findMany({
      where: { status: "PENDING", productId: { not: null } },
      orderBy: { priority: "desc" },
      take: BATCH_SIZE,
    });

    for (const opportunity of opportunities) {
      ctx.counters.processed += 1;
      if (!opportunity.productId) continue;

      const product = await prisma.product.findUnique({
        where: { id: opportunity.productId },
        include: {
          category: true,
          offers: { orderBy: { observedAt: "desc" }, take: 1 },
          priceStats: true,
          opportunityScore: true,
        },
      });
      if (!product) continue;

      const verifiedFacts = buildVerifiedFacts(product);
      if (!verifiedFacts) {
        ctx.counters.errors += 1;
        continue;
      }

      try {
        const result = await provider.generate({
          contentType: "PRODUCT",
          promptVersion: PROMPT_VERSION,
          slug: product.slug,
          facts: verifiedFacts,
        });

        const hash = contentHash(result.body);

        await prisma.generatedContent.upsert({
          where: { contentType_slug: { contentType: "PRODUCT", slug: product.slug } },
          create: {
            contentType: "PRODUCT",
            entityId: product.id,
            slug: product.slug,
            title: result.title,
            metaTitle: result.metaTitle,
            metaDescription: result.metaDescription,
            body: result.body,
            model: result.model,
            promptVersion: result.promptVersion,
            status: "DRAFT",
            contentHash: hash,
            demandScoreAtGeneration: opportunity.overallScore,
          },
          update: {
            title: result.title,
            metaTitle: result.metaTitle,
            metaDescription: result.metaDescription,
            body: result.body,
            model: result.model,
            promptVersion: result.promptVersion,
            status: "DRAFT",
            contentHash: hash,
            demandScoreAtGeneration: opportunity.overallScore,
          },
        });

        await prisma.searchOpportunity.update({
          where: { id: opportunity.id },
          data: { status: "DONE" },
        });
        ctx.counters.created += 1;
      } catch (err) {
        ctx.counters.errors += 1;
        ctx.metadata[`error_${opportunity.id}`] = String(err);
      }
    }
  });
}

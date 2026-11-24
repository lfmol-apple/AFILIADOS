import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { fetchSiblingOffers, cheapestOffer } from "@/lib/services/commercial-intelligence/sibling-offers";
import { evaluatePriceCompetitiveness } from "@/lib/services/commercial-intelligence/price-competitiveness";
import { evaluateCommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { getVitrineFinancialSummary } from "@/lib/services/vitrine-financials";

/**
 * Resolves due prospective checkpoints (7/15/30/60/90 days after a Lab
 * snapshot) against REAL, freshly-observed data — never the data frozen
 * at selection time, and never written before dueAt actually passes
 * (owner's requirement: no lookahead, no early/fabricated results).
 * Intended to run daily; a checkpoint not yet due is simply skipped
 * every day until it is.
 */
export async function runDueCheckpoints(): Promise<{ resolved: number; skipped: number }> {
  const due = await prisma.commercialSelectionCheckpoint.findMany({
    where: { dueAt: { lte: new Date() }, completedAt: null },
    include: { snapshot: { include: { items: true } } },
  });

  let resolved = 0;
  for (const checkpoint of due) {
    const results = [];
    for (const item of checkpoint.snapshot.items) {
      const listing = await prisma.merchantListing.findUnique({
        where: { id: item.merchantListingId },
        select: {
          active: true,
          availability: true,
          canonicalProductId: true,
          canonicalProduct: { select: { publicSlug: true } },
          trend: { select: { rankLatest: true, direction: true, lastSeenInRankingAt: true } },
        },
      });
      if (!listing) {
        results.push({ merchantListingId: item.merchantListingId, status: "listing_not_found" });
        continue;
      }

      const slug = listing.canonicalProduct?.publicSlug;
      const product = slug ? await loadPublicMerchantProduct(slug).catch(() => null) : null;

      let priceCompetitiveness = null;
      if (listing.canonicalProductId && product) {
        const siblings = await fetchSiblingOffers(listing.canonicalProductId, item.merchantListingId);
        priceCompetitiveness = evaluatePriceCompetitiveness({
          merchantListingId: item.merchantListingId,
          siblingOffers: siblings,
          thisPrice: product.currentPrice,
          priceHistory: product.priceHistory,
        });
      }

      const representative = listing.canonicalProductId
        ? cheapestOffer(await fetchSiblingOffers(listing.canonicalProductId, item.merchantListingId))
        : null;
      const commissionEvidence = evaluateCommissionEvidence({
        individualRate: null,
        individualCapturedAt: null,
        mlCategoryId: representative?.mlCategoryId ?? null,
        currentPrice: product?.currentPrice ?? null,
      });

      results.push({
        merchantListingId: item.merchantListingId,
        stillActive: listing.active,
        availability: listing.availability,
        officialRankLatest: listing.trend?.rankLatest ?? null,
        officialRankDirection: listing.trend?.direction ?? null,
        stillInOfficialRanking: listing.trend?.lastSeenInRankingAt
          ? Date.now() - listing.trend.lastSeenInRankingAt.getTime() < 14 * 86_400_000
          : null,
        currentPrice: product?.currentPrice ?? null,
        priceCompetitivenessScore: priceCompetitiveness?.competitivenessScore ?? null,
        hasConfirmedPriceDrop: priceCompetitiveness?.hasConfirmedPriceDrop ?? false,
        commissionEvidenceType: commissionEvidence.type,
        commissionEstimatedValueBrl: commissionEvidence.estimatedValueBrl,
      });
    }

    // Owner's authorization, 2026-11-19, "Laboratório de Inteligência":
    // "estender o laboratório para avaliar futuramente a superioridade
    // financeira das metodologias." Real financial result, scoped to
    // this checkpoint's own window — but only at CAMPAIGN/tag
    // granularity (confirmed this session: Meta's own ad spend reports
    // at campaign level, not per product), never attributed to a single
    // product in this snapshot. Reported plainly as "aguardando
    // evidência" whenever spend/commission haven't been recorded yet —
    // never a fabricated number standing in for a missing campaign.
    const financialResult = await getVitrineFinancialSummary({
      periodStart: checkpoint.snapshot.referenceDate,
      periodEnd: new Date(),
    }).catch(() => null);

    await prisma.commercialSelectionCheckpoint.update({
      where: { id: checkpoint.id },
      data: {
        completedAt: new Date(),
        results: {
          items: results,
          // Owner's explicit rule: never claim the algorithm's own score
          // as proof of superiority — this is the ONE real, independent
          // financial signal, at the only granularity that's honest
          // (campaign-wide, not per product), and it's the same number
          // for every methodology's checkpoint in this reference date
          // (they all share the same real ad account) — comparing
          // methodologies by THIS requires looking across checkpoints
          // from different periods once each methodology gets its own
          // real campaign, never claimed as already differentiated here.
          campaignFinancialResult:
            financialResult && (financialResult.adSpendBrl !== null || financialResult.approvedCommissionBrl !== null)
              ? financialResult
              : { status: "aguardando_evidencia", detail: "Sem investimento e/ou comissão registrados ainda para este período." },
        } as object,
      },
    });
    resolved += 1;
  }

  const totalPending = await prisma.commercialSelectionCheckpoint.count({ where: { completedAt: null } });
  return { resolved, skipped: totalPending };
}

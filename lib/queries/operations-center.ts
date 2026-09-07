import { prisma } from "@/lib/db";

/**
 * "Centro de Operações" — /admin's answer to "o que eu preciso fazer hoje
 * para ganhar mais comissão?" (project brief, 2026-09-07). Deliberately
 * reuses the same tables PR #4/#5 already built (MerchantListing,
 * MerchantListingSignal, MonetizationScore, AffiliateLinkRegistry) — no
 * new entity, no new score, no duplicated storage. This file only adds
 * the unified read shape /admin needs across merchants; the underlying
 * per-merchant queries (getMlAffiliateQueue, getShopeeShowcase) still own
 * their own rules and keep working unchanged.
 */

export type OpportunityLinkStatus = "ACTIVE" | "PENDING_HUMAN" | "NONE";

export interface OperationsOpportunity {
  merchantListingId: string;
  merchant: "SHOPEE" | "MERCADO_LIVRE";
  title: string;
  imageUrl: string | null;
  price: number | null;
  commissionRate: number | null;
  soldQuantity: number | null;
  bestsellerRank: number | null;
  rating: number | null;
  monetizationScore: number | null;
  monetizationConfidence: number;
  linkStatus: OpportunityLinkStatus;
  /** Only set when linkStatus is "ACTIVE" — never a raw marketplace URL,
   * always the internal redirect so the click gets tracked (project brief
   * rule: CTA sempre via /go/[merchant]/[externalId]). */
  ctaHref: string | null;
  recommendedAction: string;
}

const MERCHANT_TO_CTA_SEGMENT: Record<"SHOPEE" | "MERCADO_LIVRE", string> = {
  SHOPEE: "shopee",
  MERCADO_LIVRE: "mercado-livre",
};

/**
 * Top scored opportunities across every merchant that has real
 * MonetizationScore evidence — Shopee and Mercado Livre today, whatever
 * merchant gets a provider next automatically included, nothing
 * hardcoded per-merchant beyond field mapping. Ordered by score desc, so
 * the highest-value item is always first regardless of merchant.
 */
export async function getTodaysOpportunities(
  limit: number = 20,
): Promise<OperationsOpportunity[]> {
  // Excludes real per-seller offer rows (scripts/ml-enrich-offers.ts,
  // MerchantListingSignal.source "mercado_livre_catalog_items") at the DB
  // level — a catalog product can have dozens of those, and none of them
  // is its own separate "opportunity" here (they're surfaced only as the
  // catalog row's enriched bestOffer via the ML pending-link queue,
  // lib/queries/ml-affiliate-queue.ts). A JS-side post-filter after a
  // fixed `take` was tried first and was wrong: with enough real offers
  // outranking the catalog rows by score, the buffer could fill entirely
  // with offers, filtering every catalog row away before it was even
  // fetched (found 2026-09-07: 179 real offers outranked all 18 catalog
  // rows). Harmless no-op for Shopee, which never writes that source.
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } },
      monetizationScore: { isNot: null },
      signals: { none: { source: "mercado_livre_catalog_items" } },
    },
    include: {
      merchant: { select: { code: true } },
      affiliateLink: true,
      monetizationScore: true,
      canonicalProduct: { select: { title: true, imageUrl: true, specifications: true } },
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
    orderBy: { monetizationScore: { score: "desc" } },
    take: limit,
  });

  return listings
    .filter(
      (l): l is typeof l & { merchant: { code: "SHOPEE" | "MERCADO_LIVRE" } } =>
        l.merchant.code === "SHOPEE" || l.merchant.code === "MERCADO_LIVRE",
    )
    .slice(0, limit)
    .map((listing) => {
      const merchant = listing.merchant.code;
      const signal = listing.signals[0];
      const raw = signal?.raw as
        | { productName?: string; imageUrl?: string; priceMin?: string; price?: number }
        | null;

      const linkStatus: OpportunityLinkStatus =
        listing.affiliateLink?.status === "ACTIVE"
          ? "ACTIVE"
          : merchant === "MERCADO_LIVRE"
            ? "PENDING_HUMAN"
            : "NONE";

      const price = raw?.priceMin ? Number(raw.priceMin) : (raw?.price ?? null);

      return {
        merchantListingId: listing.id,
        merchant,
        title: listing.canonicalProduct?.title ?? raw?.productName ?? listing.externalId,
        imageUrl: listing.canonicalProduct?.imageUrl ?? raw?.imageUrl ?? null,
        price: price !== null && !Number.isNaN(price) ? price : null,
        commissionRate: signal?.commissionRate ?? null,
        soldQuantity: signal?.soldQuantity ?? null,
        bestsellerRank: signal?.bestsellerRank ?? signal?.trendRank ?? null,
        rating: signal?.rating ?? null,
        monetizationScore: listing.monetizationScore?.score ?? null,
        monetizationConfidence: listing.monetizationScore?.confidence ?? 0,
        linkStatus,
        ctaHref:
          linkStatus === "ACTIVE"
            ? `/go/${MERCHANT_TO_CTA_SEGMENT[merchant]}/${encodeURIComponent(listing.externalId)}?pageType=admin&pageSlug=operations&source=operations_center`
            : null,
        recommendedAction:
          linkStatus === "ACTIVE"
            ? "Já monetizado — acompanhar cliques."
            : merchant === "MERCADO_LIVRE"
              ? "Gerar link afiliado no painel ML e colar abaixo."
              : "Sem link ativo — verificar geração automática do Shopee.",
      };
    });
}

export interface OperationsSummary {
  newListingsToday: number;
  activeLinks: number;
  pendingLinks: number;
  affiliateClicksToday: number;
  activeMerchants: string[];
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * "Resumo do dia" — only counts that exist for real. No conversion
 * estimate, no fabricated revenue number (project brief section 14:
 * "não crie agora uma fórmula falsa de conversão sem dados").
 */
export async function getOperationsSummary(): Promise<OperationsSummary> {
  const since = startOfToday();
  const [newListingsToday, activeLinks, pendingLinks, affiliateClicksToday, activeMerchants] =
    await Promise.all([
      prisma.merchantListing.count({
        where: { createdAt: { gte: since }, merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } } },
      }),
      prisma.affiliateLinkRegistry.count({
        where: { status: "ACTIVE", merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } } },
      }),
      prisma.merchantListing.count({
        where: {
          active: true,
          merchant: { code: "MERCADO_LIVRE" },
          monetizationScore: { isNot: null },
          OR: [{ affiliateLink: { is: null } }, { affiliateLink: { isNot: null, is: { status: { not: "ACTIVE" } } } }],
        },
      }),
      prisma.affiliateClick.count({
        where: { createdAt: { gte: since }, merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } } },
      }),
      prisma.merchant.findMany({
        where: { active: true, code: { in: ["SHOPEE", "MERCADO_LIVRE"] } },
        select: { code: true },
      }),
    ]);

  return {
    newListingsToday,
    activeLinks,
    pendingLinks,
    affiliateClicksToday,
    activeMerchants: activeMerchants.map((m) => m.code),
  };
}

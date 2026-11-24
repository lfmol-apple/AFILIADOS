import { prisma } from "@/lib/db";
import { rankLinkCandidates } from "@/lib/services/ml-link-priorities";
import { offerCategoryLabel } from "@/lib/offers/categories";

/**
 * Read-only: lists Mercado Livre bestsellers that still have NO active
 * affiliate link, best "demand x commission" first, so the owner knows which
 * links to generate next. Usage: npx tsx scripts/ml-link-priorities.ts [top]
 */
async function main() {
  const top = Number(process.argv[2] ?? 30);
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "MERCADO_LIVRE" },
      affiliateLink: { is: null },
      signals: { none: { source: "mercado_livre_catalog_items" } },
    },
    select: {
      externalId: true,
      canonicalProduct: { select: { title: true, specifications: true } },
      signals: {
        orderBy: { observedAt: "desc" },
        take: 1,
        select: { bestsellerRank: true },
      },
    },
  });
  const candidates = listings.flatMap((l) => {
    const rank = l.signals[0]?.bestsellerRank;
    if (rank == null || !l.canonicalProduct) return [];
    return [
      {
        externalId: l.externalId,
        title: l.canonicalProduct.title,
        mlDomainId:
          (l.canonicalProduct.specifications as { domainId?: string } | null)
            ?.domainId ?? null,
        bestsellerRank: rank,
        price: null,
      },
    ];
  });
  const ranked = rankLinkCandidates(candidates).slice(0, top);
  console.log(
    `Sem link: ${candidates.length} bestsellers. Top ${ranked.length}:`,
  );
  ranked.forEach((r, i) => {
    const rate =
      r.commissionRate === null
        ? "sem dado"
        : `${Math.round(r.commissionRate * 100)}%`;
    console.log(
      `${i + 1}. [${rate}] #${r.bestsellerRank} ${offerCategoryLabel(r.categorySlug)} | ${r.title.slice(0, 80)} | https://www.mercadolivre.com.br/p/${r.externalId}`,
    );
  });
}
main().finally(() => prisma.$disconnect());

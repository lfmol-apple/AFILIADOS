import { prisma } from "@/lib/db";

export interface VitrineLinkQueueRow {
  merchantListingId: string;
  title: string;
  productUrl: string;
  groupType: string;
  score: number;
  reason: string;
}

/**
 * Active Vitrine selections that still need their own "vitrinedinamica"
 * link — mirrors loadPanelQueue() (ml-panel-queue-data.ts) but reads from
 * VitrineSelection/VitrineLink instead of the hardcoded panel-pick lists,
 * since every candidate here was already discovered by the real ML/Shopee
 * jobs (see lib/services/vitrine-selection.ts).
 */
export async function loadVitrineLinkQueue(): Promise<{
  pending: VitrineLinkQueueRow[];
  activeCount: number;
  linkedCount: number;
}> {
  const selections = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE" },
    orderBy: { score: "desc" },
    include: {
      merchantListing: {
        select: {
          id: true,
          productUrl: true,
          canonicalProduct: { select: { title: true } },
          vitrineLink: { select: { status: true } },
        },
      },
    },
  });

  const pending: VitrineLinkQueueRow[] = [];
  let linkedCount = 0;
  for (const selection of selections) {
    const listing = selection.merchantListing;
    if (listing.vitrineLink?.status === "ACTIVE") {
      linkedCount += 1;
      continue;
    }
    pending.push({
      merchantListingId: listing.id,
      title: listing.canonicalProduct?.title ?? "(produto sem título)",
      productUrl: listing.productUrl,
      groupType: selection.groupType,
      score: selection.score,
      reason: selection.reason,
    });
  }

  return { pending, activeCount: selections.length, linkedCount };
}

import { prisma } from "@/lib/db";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";

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
 *
 * Owner's correction, 2026-11-22 (Etapa 6, item 6: "garanta que novas
 * vitrines não sejam publicadas vazias por falta de links"): this still
 * had the exact same missing-vitrineId gap already fixed in the admin
 * panel, the Meta XML route and jobs/vitrine-renew.ts (commit 5d3e471) —
 * found late because it's the one real caller of VitrineSelection that
 * none of those three earlier fixes happened to touch. Defaults to the
 * legacy Vitrine Geral (every existing caller passes no argument), so
 * this is a pure bugfix, not a behavior change for today's only real
 * vitrine — but it's the one that would have silently mixed two
 * vitrines' pending links together the moment a second one went ACTIVE.
 */
export async function loadVitrineLinkQueue(vitrineId?: string): Promise<{
  pending: VitrineLinkQueueRow[];
  activeCount: number;
  linkedCount: number;
}> {
  const scopedVitrineId = vitrineId ?? (await getLegacyVitrineId());
  const selections = await prisma.vitrineSelection.findMany({
    where: { vitrineId: scopedVitrineId, status: "ACTIVE" },
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

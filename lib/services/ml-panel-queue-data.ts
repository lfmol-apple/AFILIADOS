import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import {
  rankAllForLinking,
  type QueueEntry,
} from "@/lib/services/ml-panel-queue";
import { loadRegisteredPanelIds } from "@/lib/services/ml-panel-register";

async function loadSiteSlugs(): Promise<string[]> {
  const [canonical, listings] = await Promise.all([
    prisma.canonicalProduct.findMany({
      where: { publicSlug: { not: null } },
      select: { publicSlug: true },
    }),
    prisma.merchantListing.findMany({
      where: { slug: { not: null } },
      select: { slug: true },
    }),
  ]);
  return [
    ...canonical.map((c) => c.publicSlug!),
    ...listings.map((l) => l.slug!),
  ];
}

export interface PanelQueueData {
  /** Rows still waiting for a link, best first (best sellers with a good rating, biggest commission in reais). */
  pending: QueueEntry[];
  registeredCount: number;
  onSiteCount: number;
}

/** The panel products still waiting for the owner's affiliate link. */
export async function loadPanelQueue(): Promise<PanelQueueData> {
  const [slugs, registered] = await Promise.all([
    loadSiteSlugs(),
    loadRegisteredPanelIds(),
  ]);
  const { toLink, onSite } = rankAllForLinking(ML_PANEL_PICKS, slugs);
  return {
    pending: toLink.filter((e) => !registered.has(e.pick.id)),
    registeredCount: registered.size,
    onSiteCount: onSite.length,
  };
}

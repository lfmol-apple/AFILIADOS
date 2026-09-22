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
  /** Rows still waiting for a link. Rows with a ready generic product
   * address (the owner can click "copy address + open Linkbuilder" right
   * away) come first; the rest follow. Each of the two groups keeps the
   * money+reputation score order internally — nothing is dropped or
   * reordered beyond that split, and it's applied once here so every screen
   * that lists this queue behaves the same way. */
  pending: QueueEntry[];
  /** How many of `pending` are in the "ready" (has productUrl) group — for
   * display, e.g. "312 com link pronto, 900 ainda sem endereço". */
  readyCount: number;
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
  const notRegistered = toLink.filter((e) => !registered.has(e.pick.id));
  const ready = notRegistered.filter((e) => e.pick.productUrl);
  const waiting = notRegistered.filter((e) => !e.pick.productUrl);
  return {
    pending: [...ready, ...waiting],
    readyCount: ready.length,
    registeredCount: registered.size,
    onSiteCount: onSite.length,
  };
}

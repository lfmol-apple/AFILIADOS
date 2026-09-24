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
  /** Rows still waiting for a link AND already carrying a generic product
   * address (the owner can click "copy address + open Linkbuilder" right
   * away), in money+reputation score order. Rows without an address are not
   * listed (owner's decision, 2026-09-24: only work what can be linked now);
   * they stay in the data and return once their address is read — see
   * `withoutAddressCount`. Applied once here so every screen that lists this
   * queue behaves the same way. */
  pending: QueueEntry[];
  /** Same as pending.length, kept for the screens that show "N ready". */
  readyCount: number;
  /** Panel rows still waiting for a link but hidden because their generic
   * product address hasn't been read yet. */
  withoutAddressCount: number;
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
    pending: ready,
    readyCount: ready.length,
    withoutAddressCount: waiting.length,
    registeredCount: registered.size,
    onSiteCount: onSite.length,
  };
}

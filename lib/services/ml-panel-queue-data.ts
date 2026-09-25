import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import {
  rankAllForLinking,
  type QueueEntry,
} from "@/lib/services/ml-panel-queue";
import { loadRegisteredPanelIds } from "@/lib/services/ml-panel-register";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";

/** Catalog ids (MLB…) of the Mercado Livre products that already have an active link. */
export async function loadRegisteredCatalogIds(): Promise<Set<string>> {
  const links = await prisma.affiliateLinkRegistry.findMany({
    where: {
      status: "ACTIVE",
      merchantListing: { merchant: { code: "MERCADO_LIVRE" } },
    },
    select: { merchantListing: { select: { externalId: true } } },
  });
  return new Set(links.map((l) => l.merchantListing.externalId));
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
  const [registered, registeredCatalog] = await Promise.all([
    loadRegisteredPanelIds(),
    loadRegisteredCatalogIds(),
  ]);
  // No title-vs-slug guessing: a row that merely LOOKS like a product already
  // on the site is a different product (different catalog id, its own
  // commission) and used to be hidden by mistake — 29 rows, some paying R$ 100+
  // per sale (2026-09-25). Only an exact catalog-id match counts as "already
  // on the site".
  const { toLink } = rankAllForLinking(ML_PANEL_PICKS, []);
  const sameProductOnSite = (e: (typeof toLink)[number]) => {
    const catalogId = expectedIdsFromProductUrl(e.pick.productUrl).catalogId;
    return !!catalogId && registeredCatalog.has(catalogId);
  };
  const onSite = toLink.filter(
    (e) => !registered.has(e.pick.id) && sameProductOnSite(e),
  );
  const notRegistered = toLink.filter(
    (e) => !registered.has(e.pick.id) && !sameProductOnSite(e),
  );
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

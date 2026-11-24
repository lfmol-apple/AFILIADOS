import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import {
  catalogFirst,
  rankAllForLinking,
  type QueueEntry,
} from "@/lib/services/ml-panel-queue";
import { loadRegisteredPanelIds } from "@/lib/services/ml-panel-register";
import { loadIssuePanelIds } from "@/lib/services/ml-panel-issues";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";
import { loadOrphanedRecoveryCandidates } from "@/lib/services/ml-panel-recovery";

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
  /** Of `pending`, how many are historical recoveries (see
   * lib/services/ml-panel-recovery.ts) rather than a fresh, never-
   * attempted pick — shown so the owner knows some rows are "redo this
   * one, the link never saved last time", not new inventory. */
  recoveredCount: number;
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
  /** Rows taken out of the queue because they can't become a link. */
  issueCount: number;
}

/** The panel products still waiting for the owner's affiliate link. */
export async function loadPanelQueue(): Promise<PanelQueueData> {
  const [registered, registeredCatalog, issues, recoverable] = await Promise.all([
    loadRegisteredPanelIds(),
    loadRegisteredCatalogIds(),
    loadIssuePanelIds(),
    loadOrphanedRecoveryCandidates(),
  ]);
  const recoverablePickIds = new Set(recoverable.map((c) => c.pick.id));
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
  // "Registered" normally means done — but a recoverable row IS registered
  // (it has a panel_pick signal) with no real link behind it (the
  // historical incident this queue now undoes, see ml-panel-recovery.ts),
  // so it's treated as not-registered here, same as any fresh pick.
  const isRegistered = (e: (typeof toLink)[number]) =>
    registered.has(e.pick.id) && !recoverablePickIds.has(e.pick.id);
  const onSite = toLink.filter((e) => !isRegistered(e) && sameProductOnSite(e));
  const notRegistered = toLink.filter(
    (e) => !isRegistered(e) && !issues.has(e.pick.id) && !sameProductOnSite(e),
  );
  const ready = notRegistered.filter((e) => e.pick.productUrl);
  const waiting = notRegistered.filter((e) => !e.pick.productUrl);
  return {
    recoveredCount: ready.filter((e) => recoverablePickIds.has(e.pick.id)).length,
    pending: catalogFirst(ready),
    readyCount: ready.length,
    withoutAddressCount: waiting.length,
    registeredCount: registered.size,
    onSiteCount: onSite.length,
    issueCount: issues.size,
  };
}

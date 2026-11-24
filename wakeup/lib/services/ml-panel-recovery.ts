import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS, type PanelPick } from "@/lib/config/ml-panel-picks";
import { QUEUE_RULES } from "@/lib/services/ml-panel-queue";
import { expectedIdsFromProductUrl } from "@/lib/services/ml-panel-check-logic";

export interface OrphanedRecoveryCandidate {
  pick: PanelPick;
  merchantListingId: string;
}

/**
 * Historical incident, audited 2026-11-17 and fixed at the source in
 * registerPanelPick (lib/services/ml-panel-register.ts): a panel_pick
 * signal could end up persisted with no real AffiliateLinkRegistry row
 * behind it, when the link save failed (a legitimate rejection — a
 * duplicate link, an invalid domain) AFTER the signal had already been
 * written, with no transaction tying the two together. Confirmed live:
 * 2,144 of 2,401 historical panel_pick signals had this gap, 2,130 of
 * them from the very first batch session (2026-09-25/26) — not an
 * ongoing problem (every attempt since has succeeded), but real past
 * work with nothing to show for it. The fix above stops new ones;
 * nothing here deletes or touches the historical rows.
 *
 * Owner's instruction, 2026-11-17: never recover all 2,144 blindly.
 * Only a listing that is (1) still active, (2) not already covered by
 * an active link on a DIFFERENT listing for the same real product, and
 * (3) clears the same real floor every other panel queue in this
 * project uses (QUEUE_RULES: rating >= 4.5, sold >= 500 — not a new
 * bar invented for this) is offered again. Deliberately a REAL floor
 * here, unlike rankAllForLinking's normal "no cuts" queue: this is a
 * one-time historical clean-up decision about what's worth a human's
 * time to re-link, not the ongoing ranking of fresh picks.
 */
export async function loadOrphanedRecoveryCandidates(): Promise<
  OrphanedRecoveryCandidate[]
> {
  const [orphanSignals, activeLinks] = await Promise.all([
    prisma.merchantListingSignal.findMany({
      where: { source: "panel_pick", merchantListing: { affiliateLink: null } },
      select: {
        raw: true,
        merchantListingId: true,
        merchantListing: { select: { active: true } },
      },
    }),
    prisma.affiliateLinkRegistry.findMany({
      where: { status: "ACTIVE", merchantListing: { merchant: { code: "MERCADO_LIVRE" } } },
      select: { merchantListing: { select: { externalId: true } } },
    }),
  ]);

  const registeredCatalogIds = new Set(
    activeLinks.map((l) => l.merchantListing.externalId),
  );

  const byTitle = new Map<string, PanelPick>();
  for (const pick of ML_PANEL_PICKS) {
    if (!byTitle.has(pick.title)) byTitle.set(pick.title, pick);
  }

  const candidates: OrphanedRecoveryCandidate[] = [];
  const seenPickIds = new Set<string>();
  for (const row of orphanSignals) {
    if (!row.merchantListing.active) continue;

    const raw = row.raw as { panelTitle?: string } | null;
    const title = raw?.panelTitle;
    if (!title) continue;
    const pick = byTitle.get(title);
    if (!pick || seenPickIds.has(pick.id)) continue;

    if (pick.rating === null || pick.rating < QUEUE_RULES.minRating) continue;
    if (pick.sold < QUEUE_RULES.minSold) continue;

    const catalogId = expectedIdsFromProductUrl(pick.productUrl).catalogId;
    if (catalogId && registeredCatalogIds.has(catalogId)) continue; // already linked under a different listing

    seenPickIds.add(pick.id);
    candidates.push({ pick, merchantListingId: row.merchantListingId });
  }

  return candidates;
}

import { prisma } from "@/lib/db";
import {
  matchOpenedLinkToPick,
  type MatchablePick,
} from "@/lib/services/ml-panel-check-logic";
import { openBlackFridayAffiliateLink } from "@/lib/services/ml-panel-check";
import { type BatchRow } from "@/lib/services/ml-panel-batch";
import { isAllowedBlackFridayHost } from "@/lib/services/black-friday-2026";

/**
 * Owner's directive, 2026-11-26 ("Conclua a funcionalidade de geração e
 * importação em lote dos 30 links"): same batch-paste flow the regular
 * precocaindo queue and the Vitrine Inteligente queue already have
 * (lib/services/vitrine-link-batch.ts, mirrored almost exactly) — paste
 * up to 30 affiliate links generated in the Linkbuilder at once, each one
 * opened for real and matched to its product by catalog id (falling back
 * to title), never by paste order. Saving still goes through the same
 * host-allowlist + duplicate-group checks as the single-link flow
 * (updateBlackFridayProduct) — this is read-only preview.
 */
export async function previewBlackFridayBatch(
  links: string[],
  pending: readonly MatchablePick[],
): Promise<BatchRow[]> {
  const titleOf = new Map(pending.map((p) => [p.id, p.title]));
  const positionOf = new Map(pending.map((p, i) => [p.id, i + 1]));

  const rows: BatchRow[] = [];
  const CONCURRENCY = 5;
  let next = 0;
  async function worker() {
    while (next < links.length) {
      const i = next++;
      const link = links[i]!;
      rows[i] = await checkOne(link);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, links.length) }, worker));

  async function checkOne(link: string): Promise<BatchRow> {
    const empty = { link, linkTitle: null, pickId: null, position: null, pickTitle: null };
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return { ...empty, status: "invalid" };
    }
    if (!isAllowedBlackFridayHost(url)) return { ...empty, status: "invalid" };

    const taken = await prisma.blackFridayProduct.findFirst({
      where: { affiliateUrl: link },
      select: { id: true },
    });
    if (taken) return { ...empty, status: "duplicate" };

    const opened = await openBlackFridayAffiliateLink(link);
    if (!opened.title && !opened.catalogId) return { ...empty, status: "unreadable" };
    if (opened.profileOk === false) return { ...empty, linkTitle: opened.title, status: "notMine" };

    const match = matchOpenedLinkToPick(opened, pending);
    if (!match.pickId) return { ...empty, linkTitle: opened.title, status: "none" };
    return {
      link,
      linkTitle: opened.title,
      pickId: match.pickId,
      position: positionOf.get(match.pickId) ?? null,
      pickTitle: titleOf.get(match.pickId) ?? null,
      how: match.how ?? undefined,
      status: match.how === "id" || match.how === "title-exact" ? "match" : "likely",
    };
  }

  // Two links claiming the same row: keep the first, flag the rest — never
  // silently pick one.
  const claimed = new Set<string>();
  return rows.map((row) => {
    if (!row.pickId) return row;
    if (claimed.has(row.pickId)) return { ...row, status: "repeated" as const };
    claimed.add(row.pickId);
    return row;
  });
}

import { prisma } from "@/lib/db";
import {
  matchOpenedLinkToPick,
  type MatchablePick,
} from "@/lib/services/ml-panel-check-logic";
import { openVitrineAffiliateLink } from "@/lib/services/ml-panel-check";
import { type BatchRow } from "@/lib/services/ml-panel-batch";

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

/** Owner's requirement, 2026-11-20 ("Ordem de Execução", section 6): the
 * single-link flow at /admin/vitrine-links works but is slower than it
 * needs to be for 30 links at once — the regular precocaindo queue has
 * had a batch mode (/admin/fila-links/lote) for a while. This mirrors
 * lib/services/ml-panel-batch.ts's previewBatch() almost exactly, with
 * two real differences: it opens links checking for the "vitrinedinamica"
 * tag (openVitrineAffiliateLink), and duplicates/cross-product checks
 * read VitrineLink, never AffiliateLinkRegistry — the two tags' queues
 * must never be able to affect each other.
 *
 * Known, accepted simplification (documented rather than silently
 * matched): the "productOnSite" cross-check (catching when the SAME
 * physical product already carries a different link elsewhere) is not
 * reproduced here, because the Vitrine's own family-level dedup
 * (buildCommercialCandidatePool: canonical id + brand/model + title
 * prefix) already keeps two rows of the exact same product out of the
 * pending queue in the first place — the scenario this check exists for
 * in the older, less deduplicated panel queue essentially can't occur
 * here. If it ever does (a dedup gap), the plain affiliateUrl-duplicate
 * check below still catches a literal repeat.
 */
export async function previewVitrineBatch(
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
    let host = "";
    try {
      host = new URL(link).hostname;
    } catch {
      return { ...empty, status: "invalid" };
    }
    if (!MELI_HOSTS.test(host)) return { ...empty, status: "invalid" };

    const taken = await prisma.vitrineLink.findFirst({
      where: { affiliateUrl: link, status: "ACTIVE" },
      select: { id: true },
    });
    if (taken) return { ...empty, status: "duplicate" };

    const opened = await openVitrineAffiliateLink(link);
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

  // Two links claiming the same row: keep the first, flag the rest — same
  // rule as the panel batch, never silently pick one.
  const claimed = new Set<string>();
  return rows.map((row) => {
    if (!row.pickId) return row;
    if (claimed.has(row.pickId)) return { ...row, status: "repeated" as const };
    claimed.add(row.pickId);
    return row;
  });
}


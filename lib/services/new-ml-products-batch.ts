import { prisma } from "@/lib/db";
import {
  matchOpenedLinkToPick,
  type MatchablePick,
} from "@/lib/services/ml-panel-check-logic";
import { openAffiliateLink } from "@/lib/services/ml-panel-check";

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

export const BATCH_MAX_LINKS = 40;

export type NewMlBatchStatus =
  | "match"
  | "likely"
  | "none"
  | "repeated"
  | "duplicate"
  | "notMine"
  | "unreadable"
  | "invalid";

export interface NewMlBatchRow {
  link: string;
  status: NewMlBatchStatus;
  linkTitle: string | null;
  merchantListingId: string | null;
  productTitle: string | null;
  how?: "id" | "title-exact" | "title";
}

async function pool<T, R>(
  items: T[],
  size: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await work(items[i]!);
      }
    }),
  );
  return results;
}

/**
 * Same shape as lib/services/ml-panel-batch.ts's previewBatch, trimmed for
 * /admin/produtos-novos-ml: candidates here are always already-unlinked
 * MerchantListing rows (lib/queries/new-ml-products.ts already guarantees
 * no sibling is ACTIVE-linked), so the "productOnSite" branch and its
 * recordPanelIssue side effect — meaningful only for the panel-pick id
 * scheme — don't apply here. Read-only; saving happens one link at a time
 * through the existing POST /api/admin/ml-affiliate-links.
 */
export async function previewNewMlProductsBatch(
  links: string[],
  candidates: readonly MatchablePick[],
): Promise<NewMlBatchRow[]> {
  const titleOf = new Map(candidates.map((c) => [c.id, c.title]));

  const rows = await pool(links, 5, async (link): Promise<NewMlBatchRow> => {
    const empty = {
      link,
      linkTitle: null,
      merchantListingId: null,
      productTitle: null,
    };
    let host = "";
    try {
      host = new URL(link).hostname;
    } catch {
      return { ...empty, status: "invalid" };
    }
    if (!MELI_HOSTS.test(host)) return { ...empty, status: "invalid" };

    const taken = await prisma.affiliateLinkRegistry.findFirst({
      where: { affiliateUrl: link, status: "ACTIVE" },
      select: { id: true },
    });
    if (taken) return { ...empty, status: "duplicate" };

    const opened = await openAffiliateLink(link);
    if (!opened.title && !opened.catalogId)
      return { ...empty, status: "unreadable" };
    if (opened.profileOk === false)
      return { ...empty, linkTitle: opened.title, status: "notMine" };

    const match = matchOpenedLinkToPick(opened, candidates);
    if (!match.pickId)
      return { ...empty, linkTitle: opened.title, status: "none" };
    return {
      link,
      linkTitle: opened.title,
      merchantListingId: match.pickId,
      productTitle: titleOf.get(match.pickId) ?? null,
      how: match.how ?? undefined,
      status:
        match.how === "id" || match.how === "title-exact" ? "match" : "likely",
    };
  });

  const claimed = new Set<string>();
  return rows.map((row) => {
    if (!row.merchantListingId) return row;
    if (claimed.has(row.merchantListingId))
      return { ...row, status: "repeated" as const };
    claimed.add(row.merchantListingId);
    return row;
  });
}

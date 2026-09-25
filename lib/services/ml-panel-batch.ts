import { prisma } from "@/lib/db";
import {
  matchOpenedLinkToPick,
  type MatchablePick,
} from "@/lib/services/ml-panel-check-logic";
import { openAffiliateLink } from "@/lib/services/ml-panel-check";

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

export const BATCH_MAX_LINKS = 40;

export type BatchStatus =
  | "match" // same catalog id as a queue row: safe to save
  | "likely" // only the title agrees: owner confirms one by one
  | "none" // matches no pending row
  | "repeated" // another link of this batch already claims that row
  | "duplicate" // link already saved on a product
  | "notMine" // opened, but the owner's tag is not in it
  | "unreadable" // could not open/read it
  | "invalid"; // not a Mercado Livre link

export interface BatchRow {
  link: string;
  status: BatchStatus;
  linkTitle: string | null;
  pickId: string | null;
  position: number | null;
  pickTitle: string | null;
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
 * Opens every pasted link and says which pending queue row it belongs to. Saves
 * nothing. `pending` is the queue in order (position = index + 1).
 */
export async function previewBatch(
  links: string[],
  pending: readonly MatchablePick[],
): Promise<BatchRow[]> {
  const titleOf = new Map(pending.map((p) => [p.id, p.title]));
  const positionOf = new Map(pending.map((p, i) => [p.id, i + 1]));

  const rows = await pool(links, 5, async (link): Promise<BatchRow> => {
    const empty = {
      link,
      linkTitle: null,
      pickId: null,
      position: null,
      pickTitle: null,
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

    const match = matchOpenedLinkToPick(opened, pending);
    if (!match.pickId)
      return { ...empty, linkTitle: opened.title, status: "none" };
    return {
      link,
      linkTitle: opened.title,
      pickId: match.pickId,
      position: positionOf.get(match.pickId) ?? null,
      pickTitle: titleOf.get(match.pickId) ?? null,
      status: match.how === "id" ? "match" : "likely",
    };
  });

  // Two links claiming the same row: keep the first, flag the rest.
  const claimed = new Set<string>();
  return rows.map((row) => {
    if (!row.pickId) return row;
    if (claimed.has(row.pickId)) return { ...row, status: "repeated" as const };
    claimed.add(row.pickId);
    return row;
  });
}

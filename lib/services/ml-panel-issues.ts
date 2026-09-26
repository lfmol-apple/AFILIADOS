import { prisma } from "@/lib/db";

export type PanelIssueReason =
  "same_product_live" | "no_catalog" | "program_refused" | "manual";

/** Panel row ids that were taken out of the queue because they can't become a link. */
export async function loadIssuePanelIds(): Promise<Set<string>> {
  const rows = await prisma.mlPanelPickIssue.findMany({
    select: { panelId: true },
  });
  return new Set(rows.map((r) => r.panelId));
}

/**
 * Remembers that a row is a dead end so the queue never offers it again.
 * Best-effort: it must never turn a save/check into an error.
 */
export async function recordPanelIssue(
  panelId: string,
  reason: PanelIssueReason,
  detail?: string,
): Promise<void> {
  try {
    await prisma.mlPanelPickIssue.upsert({
      where: { panelId },
      create: { panelId, reason, detail: detail?.slice(0, 300) ?? null },
      update: { reason, detail: detail?.slice(0, 300) ?? null },
    });
  } catch {
    // ignore: the row simply stays in the queue
  }
}

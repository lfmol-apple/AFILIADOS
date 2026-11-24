import { prisma } from "@/lib/db";

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * conectar a inteligência à seleção real), item 1: "a aprovação deve
 * consumir uma seleção previamente calculada, identificada e
 * persistida... se o snapshot estiver desatualizado, incompatível... ou
 * incompleto, bloqueie a aplicação e explique o motivo."
 *
 * Deliberately NEVER calls the AI analyst itself — this only reads the
 * most recent `ai_assisted_v1` CommercialSelectionSnapshot that
 * jobs/commercial-lab-run.ts already computed and persisted offline
 * (critic.ts's findings included in its own `notes` field). Reused
 * exactly as it already exists — no parallel snapshot table, no new
 * persistence shape.
 */

/** Same cadence the lab's own doc comment already states it's intended
 * to run at ("alongside VITRINE_RENEW") — a snapshot older than this is
 * never trusted for a real commercial decision, no matter how close. */
const AI_SNAPSHOT_MAX_AGE_HOURS = 24;

/** A snapshot whose real-eligible overlap falls below this fraction of
 * VITRINE_CAPACITY is treated as incompatible with today's real pool
 * (e.g. computed against a wildly different candidate universe) —
 * never silently topped up from the deterministic order to hide the
 * mismatch. */
const MIN_OVERLAP_RATIO = 0.5;

export type ValidatedAiSelection =
  | { ok: true; snapshotId: string; referenceDate: Date; orderedListingIds: string[]; criticNotes: string | null }
  | { ok: false; reason: string };

export async function loadValidatedAiSelection(): Promise<ValidatedAiSelection> {
  const snapshot = await prisma.commercialSelectionSnapshot.findFirst({
    where: { methodology: "ai_assisted_v1" },
    orderBy: { referenceDate: "desc" },
    include: { items: { orderBy: { rank: "asc" } } },
  });

  if (!snapshot) {
    return { ok: false, reason: "Nenhum snapshot ai_assisted_v1 encontrado — rode o Laboratório de Inteligência Comercial antes de aprovar uma renovação." };
  }
  if (snapshot.items.length === 0) {
    return { ok: false, reason: `Snapshot ${snapshot.id} não tem nenhum item — incompleto, não pode ser aplicado.` };
  }

  const ageHours = (Date.now() - snapshot.referenceDate.getTime()) / 3_600_000;
  if (ageHours > AI_SNAPSHOT_MAX_AGE_HOURS) {
    return {
      ok: false,
      reason: `Snapshot ${snapshot.id} desatualizado (${Math.round(ageHours)}h desde ${snapshot.referenceDate.toISOString()}, máximo ${AI_SNAPSHOT_MAX_AGE_HOURS}h) — rode o laboratório de novo antes de aprovar.`,
    };
  }

  return {
    ok: true,
    snapshotId: snapshot.id,
    referenceDate: snapshot.referenceDate,
    orderedListingIds: snapshot.items.map((i) => i.merchantListingId),
    criticNotes: snapshot.notes,
  };
}

/**
 * Cross-checks the AI-validated order against the REAL, fresh, eligible
 * candidate pool — eliminative-only by construction: anything the real
 * pipeline already rejected (price, availability, eligibility,
 * duplicate) is simply absent from `eligibleCandidates` and therefore
 * can never appear here, no matter what the snapshot says. The AI can
 * only narrow or re-order what's already real and eligible, never add
 * to it.
 */
export function intersectWithEligiblePool<T extends { merchantListingId: string }>(
  orderedListingIds: string[],
  eligibleCandidates: readonly T[],
): { ordered: T[]; overlapRatio: number } {
  const byId = new Map(eligibleCandidates.map((c) => [c.merchantListingId, c]));
  const ordered = orderedListingIds.map((id) => byId.get(id)).filter((c): c is T => c !== undefined);
  // Ratio of the AI's OWN recommended list that still holds up against
  // today's fresh, real eligibility — never relative to the full
  // candidate universe (which is routinely far larger than the
  // snapshot's own top-N and would make this ratio meaningless).
  return { ordered, overlapRatio: orderedListingIds.length === 0 ? 0 : ordered.length / orderedListingIds.length };
}

export { AI_SNAPSHOT_MAX_AGE_HOURS, MIN_OVERLAP_RATIO };

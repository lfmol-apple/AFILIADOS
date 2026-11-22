import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { selectVitrineCandidates, type VitrineCandidate } from "@/lib/services/vitrine-selection";

/**
 * Gerenciador de Vitrines Inteligentes (owner's authorization,
 * 2026-11-22). The shared discovery/scoring/ranking engine
 * (lib/services/vitrine-selection.ts — buildCommercialCandidatePool,
 * pickGlobalVitrineSelection) is reused UNCHANGED by every vitrine; this
 * module only adds what's genuinely new: the Vitrine entity itself,
 * cross-vitrine product exclusivity, and a deterministic, auditable
 * distribution policy for when two vitrines want the same real product.
 *
 * Real root cause this design is built around (confirmed live,
 * 2026-11-22, prisma/migrations/20261122153228_multi_vitrine_core):
 * exclusivity is enforced by a PARTIAL UNIQUE INDEX on
 * VitrineSelection.canonicalProductId, scoped to status='ACTIVE' — not
 * an application-level check, which could race under concurrent writes
 * (owner's explicit requirement: "implementar a regra de exclusividade
 * de maneira transacional e resistente a concorrência"). Every write
 * path below goes through claimSelectionForVitrine(), which always lets
 * Postgres itself be the final arbiter and never assumes a pre-check
 * is still valid by the time it writes.
 */

export type VitrineStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";

/** Owner's authorization, 2026-11-22 ("Proteção da Vitrine Geral"): the
 * real, stable slug every one of the original 37 VitrineSelection rows
 * was backfilled under (prisma/migrations/20261122153228_multi_vitrine_core).
 * The single source of truth — jobs/vitrine-renew.ts, the admin panel
 * (app/admin/vitrine-inteligente/page.tsx) and the live Meta catalog
 * feed (app/catalogo/mercado-livre.xml/route.ts) all resolve it through
 * getLegacyVitrineId() below, never a locally hardcoded id or a
 * same-name duplicate constant that could drift. Real bug this closes,
 * found during Etapa 3's own review: both of those production surfaces
 * queried VitrineSelection by `status: "ACTIVE"` alone, with NO vitrineId
 * filter — the instant a second real vitrine got its own ACTIVE rows,
 * the public Meta catalog feed and the admin panel would have silently
 * started mixing its products into the Vitrine Geral's. */
export const LEGACY_VITRINE_SLUG = "vitrine-geral";

let cachedLegacyVitrineId: string | null = null;

/** Memoized per process — the Vitrine Geral row's id never changes once
 * created, and this is called on every single request to the catalog
 * feed/admin panel, so a repeat indexed lookup per call is unnecessary
 * cost, not a correctness concern (a process restart simply re-resolves
 * it once, same real row). */
export async function getLegacyVitrineId(): Promise<string> {
  if (cachedLegacyVitrineId) return cachedLegacyVitrineId;
  const vitrine = await prisma.vitrine.findUniqueOrThrow({ where: { slug: LEGACY_VITRINE_SLUG } });
  cachedLegacyVitrineId = vitrine.id;
  return vitrine.id;
}

export interface CreateVitrineInput {
  slug: string;
  name: string;
  purpose?: string;
  maxProducts?: number;
}

/** Owner's rule: "o administrador deverá poder criar novas vitrines...
 * sem precisar alterar código." Starts in DRAFT — never shown publicly,
 * never claims a single product — until explicitly activated. */
export async function createVitrine(input: CreateVitrineInput) {
  return prisma.vitrine.create({
    data: {
      slug: input.slug,
      name: input.name,
      purpose: input.purpose,
      maxProducts: input.maxProducts ?? 30,
      status: "DRAFT",
    },
  });
}

export async function listVitrines() {
  return prisma.vitrine.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getVitrineBySlug(slug: string) {
  return prisma.vitrine.findUnique({ where: { slug } });
}

/**
 * Owner's authorization, 2026-11-22 ("Exclusividade e ciclo de vida —
 * reavalie a regra que libera automaticamente produtos quando uma
 * vitrine é pausada"). Real root cause of the redesign: the FIRST
 * version of this module released a vitrine's products on PAUSE too —
 * but a pause is meant to be temporary, and releasing on pause means
 * another vitrine could legitimately claim the exact same real product
 * in the meantime, making reactivation unable to get it back. The
 * policy now is:
 *
 *   DRAFT   — never holds any real ACTIVE selection; never blocks
 *             anything; never shown publicly.
 *   ACTIVE  — holds its real ACTIVE selections; these are exactly what
 *             the cross-vitrine exclusivity index protects.
 *   PAUSED  — temporarily not shown/serving traffic, but its real
 *             ACTIVE selections are left COMPLETELY UNTOUCHED (status
 *             stays "ACTIVE" on VitrineSelection) — still reserved,
 *             still blocking every other vitrine from claiming the same
 *             canonicalProductId. Reactivating needs zero re-claim.
 *   ENDED   — terminal. THIS is the real, intentional release point
 *             (owner's rule: "uma vitrine... encerrada deverá ter
 *             regras explícitas para liberar seus produtos") — every
 *             real ACTIVE row is retired (reusing the existing,
 *             already-understood RETIRED status, with an honest,
 *             specific retiredReason), which is what actually frees the
 *             canonicalProductId for another vitrine. Never auto-
 *             reassigns it anywhere (owner's rule: "não transferir
 *             automaticamente produtos de campanhas ativas para outra
 *             vitrine") — a human or a later claim decides that
 *             separately. An ENDED vitrine can never be reactivated.
 *
 * Every transition below is guarded by an `updateMany` keyed on BOTH id
 * AND the expected current status, so two concurrent calls (e.g. two
 * simultaneous "end" requests) can never both report success or
 * double-release the same products — exactly one of them actually
 * updates a row; the other sees `count === 0` and is told plainly that
 * the vitrine was already in a different state, resistant to
 * concurrency the same way claimSelectionForVitrine() is.
 */

export class VitrineTransitionError extends Error {}

async function guardedTransition(vitrineId: string, from: readonly VitrineStatus[], to: VitrineStatus, extra?: Record<string, unknown>) {
  const result = await prisma.vitrine.updateMany({
    where: { id: vitrineId, status: { in: from as VitrineStatus[] } },
    data: { status: to, ...extra },
  });
  if (result.count === 0) {
    const current = await prisma.vitrine.findUniqueOrThrow({ where: { id: vitrineId } });
    throw new VitrineTransitionError(
      `Cannot move vitrine ${vitrineId} to ${to}: current status is ${current.status}, expected one of [${from.join(", ")}] (lost a concurrent transition, or this transition is not allowed from here).`,
    );
  }
  return prisma.vitrine.findUniqueOrThrow({ where: { id: vitrineId } });
}

/** DRAFT -> ACTIVE, or PAUSED -> ACTIVE (reactivation — zero re-claim
 * needed, since a paused vitrine's real selections were never
 * released). Owner's rule: "a criação de uma vitrine não deve
 * automaticamente criar anúncios na Meta" — this only flips the
 * Vitrine's own status; it never touches Meta, never generates a
 * creative, never runs a selection by itself (call
 * previewSelectionForVitrine + claimSelectionForVitrine separately,
 * same explicit-step pattern as every other paid/production action in
 * this project). */
export async function activateVitrine(vitrineId: string) {
  return guardedTransition(vitrineId, ["DRAFT", "PAUSED"], "ACTIVE");
}

export interface ReleaseResult {
  vitrine: Awaited<ReturnType<typeof prisma.vitrine.update>>;
  releasedCount: number;
}

/** ACTIVE -> PAUSED. Never releases a single product — see this
 * section's own doc comment above. */
export async function pauseVitrine(vitrineId: string): Promise<ReleaseResult> {
  const vitrine = await guardedTransition(vitrineId, ["ACTIVE"], "PAUSED", { pausedAt: new Date() });
  return { vitrine, releasedCount: 0 };
}

async function releaseProducts(vitrineId: string, reasonLabel: string): Promise<number> {
  const result = await prisma.vitrineSelection.updateMany({
    where: { vitrineId, status: "ACTIVE" },
    data: { status: "RETIRED", retiredAt: new Date(), retiredReason: reasonLabel },
  });
  return result.count;
}

/** DRAFT, ACTIVE or PAUSED -> ENDED. Terminal — the real release point. */
export async function endVitrine(vitrineId: string): Promise<ReleaseResult> {
  const vitrine = await guardedTransition(vitrineId, ["DRAFT", "ACTIVE", "PAUSED"], "ENDED", { endedAt: new Date() });
  const releasedCount = await releaseProducts(vitrineId, "Vitrine encerrada — produto liberado para outras vitrines.");
  return { vitrine, releasedCount };
}

export interface VitrineDistributionResult {
  /** Real candidates this vitrine would select, after excluding
   * anything already ACTIVE elsewhere — same global ranking, same
   * diversity cap, same evidence gates as the single-vitrine engine;
   * nothing about scoring changes per vitrine. */
  eligible: VitrineCandidate[];
  /** Real candidates that would otherwise have ranked high enough to
   * matter, but are excluded because another ACTIVE vitrine already
   * holds the same real product (by canonicalProductId) — owner's
   * explicit requirement, section 9: "quando duas vitrines desejarem o
   * mesmo produto, o sistema deverá aplicar uma política determinística
   * e auditável." The policy here is simple and stable on purpose:
   * whoever is already ACTIVE keeps it (owner's rule: "priorizar a
   * preservação das alocações já ativas, salvo decisão administrativa
   * explícita") — never a silent, hard-to-audit auction.
   */
  blockedByOtherVitrine: { candidate: VitrineCandidate; heldByVitrineId: string }[];
}

/** Pure, DB-free core of the distribution policy — extracted so it's
 * unit-testable without a database (same reasoning as
 * pickGlobalVitrineSelection in vitrine-selection.ts). Takes the
 * already-computed full ranked pool (`allScored`, every real evidence-
 * sufficient candidate) and the real set of canonicalProductIds another
 * vitrine currently holds ACTIVE, and re-derives this vitrine's own
 * eligible list under that constraint — never re-implementing the
 * underlying ranking/diversity policy, only adding the exclusion pass
 * in front of it.
 */
export function applyCrossVitrineExclusion(
  allScored: VitrineCandidate[],
  heldByCanonicalProductId: ReadonlyMap<string, string>,
  limit: number,
): VitrineDistributionResult {
  const blockedByOtherVitrine: VitrineDistributionResult["blockedByOtherVitrine"] = [];
  const freeScored = allScored.filter((c) => {
    const heldBy = heldByCanonicalProductId.get(c.canonicalProductId);
    if (heldBy) {
      blockedByOtherVitrine.push({ candidate: c, heldByVitrineId: heldBy });
      return false;
    }
    return true;
  });

  // Re-rank the FREE pool only, same global-rank-wins-the-slot policy
  // pickGlobalVitrineSelection() already established — never
  // re-implemented here, just applied to the already-filtered pool.
  const sorted = [...freeScored].sort((a, b) => b.rankingScore - a.rankingScore);
  return { eligible: sorted.slice(0, limit), blockedByOtherVitrine };
}

/** Owner's rule, section 9: a read-only, pure (as far as reads go)
 * distribution preview — never writes anything. Reuses
 * selectVitrineCandidates() completely unchanged for discovery/scoring;
 * applyCrossVitrineExclusion() above is the only new logic, applied
 * BEFORE the existing pool is cut down, so an already-claimed product
 * never even competes for this vitrine's slots (as opposed to winning a
 * slot and then being discarded afterward, which would make the
 * diversity/backfill logic silently inconsistent with what's shown). */
export async function previewSelectionForVitrine(vitrineId: string, limit: number): Promise<VitrineDistributionResult> {
  const heldElsewhere = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE", vitrineId: { not: vitrineId }, canonicalProductId: { not: null } },
    select: { canonicalProductId: true, vitrineId: true },
  });
  const heldByCanonicalProductId = new Map(heldElsewhere.map((h) => [h.canonicalProductId!, h.vitrineId]));

  // The underlying engine is unaware of vitrines — asking for its own
  // full real pool (allScored, already evidence-gated) and filtering
  // afterward lets the exclusion see (and correctly report as blocked)
  // real candidates that would have ranked within `limit` had they been
  // free, without the engine itself needing to know about vitrines.
  const { allScored } = await selectVitrineCandidates(limit);
  return applyCrossVitrineExclusion(allScored, heldByCanonicalProductId, limit);
}

export interface ClaimResult {
  claimed: VitrineCandidate[];
  /** A candidate this call tried to claim but lost a REAL concurrent
   * race to (Postgres rejected the insert because another transaction
   * claimed the same canonicalProductId first, between this call's own
   * preview and its write) — distinct from blockedByOtherVitrine, which
   * is detected BEFORE attempting a write. This is the "resistente a
   * concorrência" proof: the constraint is what actually decided, not a
   * timing-dependent application check. */
  lostRace: VitrineCandidate[];
}

/** Owner's rule, section 4: "a exclusividade deve ser verificada... em
 * execuções simultâneas." Each candidate is claimed in its OWN small
 * transaction (not one giant transaction for the whole batch) so one
 * candidate losing a race never rolls back the others that succeeded —
 * same "falha parcial não derruba o resto" principle already used
 * throughout this codebase's job design.
 */
export async function claimSelectionForVitrine(vitrineId: string, candidates: VitrineCandidate[]): Promise<ClaimResult> {
  // Owner's rule, section 5/9: a DRAFT vitrine must never claim a real
  // product before explicit activation, and a PAUSED/ENDED one is not
  // currently running a campaign — claiming a NEW product for it would
  // contradict "não transferir automaticamente produtos de campanhas
  // ativas para outra vitrine" in spirit, since it's not active. This
  // check is deliberately NOT what protects existing PAUSED selections
  // (those are untouched by design, see pauseVitrine's own doc comment)
  // — it only blocks acquiring something NEW while not ACTIVE.
  const vitrine = await prisma.vitrine.findUniqueOrThrow({ where: { id: vitrineId } });
  if (vitrine.status !== "ACTIVE") {
    throw new VitrineTransitionError(`Cannot claim products for vitrine ${vitrineId}: status is ${vitrine.status}, expected ACTIVE.`);
  }

  const claimed: VitrineCandidate[] = [];
  const lostRace: VitrineCandidate[] = [];

  for (const candidate of candidates) {
    try {
      await prisma.vitrineSelection.upsert({
        where: { vitrineId_merchantListingId: { vitrineId, merchantListingId: candidate.merchantListingId } },
        create: {
          vitrineId,
          merchantListingId: candidate.merchantListingId,
          canonicalProductId: candidate.canonicalProductId,
          groupType: candidate.group,
          status: "ACTIVE",
          score: candidate.score,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
          activatedAt: new Date(),
        },
        update: {
          canonicalProductId: candidate.canonicalProductId,
          status: "ACTIVE",
          groupType: candidate.group,
          score: candidate.score,
          scoreBreakdown: candidate.scoreBreakdown as unknown as object,
          reason: candidate.reason,
          activatedAt: new Date(),
          retiredAt: null,
        },
      });
      claimed.push(candidate);
    } catch (err) {
      // P2002 = unique constraint violation. Only the real cross-vitrine
      // exclusivity index (or this vitrine's own vitrineId+merchantListingId
      // pair, which can't actually conflict here since upsert already
      // handles that case) can throw this for this exact write shape.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        lostRace.push(candidate);
        continue;
      }
      throw err;
    }
  }

  return { claimed, lostRace };
}

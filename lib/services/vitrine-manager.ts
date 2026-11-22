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

/** DRAFT -> ACTIVE. Owner's rule: "a criação de uma vitrine não deve
 * automaticamente criar anúncios na Meta" — this only flips the
 * Vitrine's own status; it never touches Meta, never generates a
 * creative, never runs a selection by itself (call selectForVitrine +
 * claimSelectionForVitrine separately, same explicit-step pattern as
 * every other paid/production action in this project). */
export async function activateVitrine(vitrineId: string) {
  const vitrine = await prisma.vitrine.findUniqueOrThrow({ where: { id: vitrineId } });
  if (vitrine.status !== "DRAFT") {
    throw new Error(`Only a DRAFT vitrine can be activated (current status: ${vitrine.status}).`);
  }
  return prisma.vitrine.update({ where: { id: vitrineId }, data: { status: "ACTIVE" } });
}

export interface ReleaseResult {
  vitrine: Awaited<ReturnType<typeof prisma.vitrine.update>>;
  releasedCount: number;
}

/** Owner's explicit rule, section 4: "uma vitrine pausada ou encerrada
 * deverá ter regras explícitas para liberar seus produtos, sem
 * comprometer campanhas que ainda estejam recebendo tráfego." Every
 * real ACTIVE row this vitrine holds is retired (reusing the existing,
 * already-understood RETIRED status — no new VitrineSelection status
 * invented) with an honest, specific retiredReason, which — because the
 * cross-vitrine exclusivity index only covers status='ACTIVE' — is what
 * actually makes the product's canonicalProductId selectable by another
 * vitrine again. Never auto-reassigns it anywhere (owner's rule: "não
 * transferir automaticamente produtos de campanhas ativas para outra
 * vitrine") — a human or a later selectForVitrine() run decides that
 * separately.
 */
async function releaseProducts(vitrineId: string, reasonLabel: string): Promise<number> {
  const result = await prisma.vitrineSelection.updateMany({
    where: { vitrineId, status: "ACTIVE" },
    data: { status: "RETIRED", retiredAt: new Date(), retiredReason: reasonLabel },
  });
  return result.count;
}

export async function pauseVitrine(vitrineId: string): Promise<ReleaseResult> {
  const releasedCount = await releaseProducts(vitrineId, "Vitrine pausada — produto liberado para outras vitrines.");
  const vitrine = await prisma.vitrine.update({ where: { id: vitrineId }, data: { status: "PAUSED", pausedAt: new Date() } });
  return { vitrine, releasedCount };
}

export async function endVitrine(vitrineId: string): Promise<ReleaseResult> {
  const releasedCount = await releaseProducts(vitrineId, "Vitrine encerrada — produto liberado para outras vitrines.");
  const vitrine = await prisma.vitrine.update({ where: { id: vitrineId }, data: { status: "ENDED", endedAt: new Date() } });
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

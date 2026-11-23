import { prisma } from "@/lib/db";
import { computeVitrineRenewalDecision, type VitrineRenewalDecision } from "@/lib/services/vitrine-renewal-decision";

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * conectar a inteligência à seleção real), item 3: "a nova página...
 * precisa mostrar EXATAMENTE a seleção que será aplicada." This is now
 * a thin presentation layer over computeVitrineRenewalDecision() — the
 * SAME function jobs/vitrine-renew.ts calls to actually apply changes.
 * No separate "preview logic" exists anymore, so the two can never
 * drift apart.
 */
export interface VitrineRevisionRow {
  merchantListingId: string;
  canonicalProductId: string | null;
  title: string;
  score: number | null;
  linkStatus: "ACTIVE" | "PENDING" | "INVALID" | "DISABLED" | "sem_registro";
  /** "mantido": stays ACTIVE unchanged this cycle. "sai_esta_semana":
   * will actually be retired if approved now (within budget).
   * "saida_adiada": outranked, but the rotation budget is exhausted —
   * stays active, deferred to a future cycle. "entra_esta_semana": will
   * actually become ACTIVE if approved now. "aguardando_link": the AI
   * recommends it, but it has no ACTIVE affiliate link yet — goes to
   * RESERVE (the explicit "preparação sem ativação pública" step), not
   * published, even if approved. */
  status: "mantido" | "sai_esta_semana" | "saida_adiada" | "entra_esta_semana" | "aguardando_link";
}

export interface VitrineRevisionPreview {
  generatedAt: Date;
  blocked: boolean;
  blockedReason: string | null;
  aiSnapshotId: string | null;
  aiSnapshotReferenceDate: Date | null;
  currentCount: number;
  recommendedCount: number;
  rotationBudgetThisWeek: number;
  rows: VitrineRevisionRow[];
  publicationBlockers: { merchantListingId: string; title: string; reason: string }[];
  criticNotes: string | null;
  /** Owner's authorization, item 3: required, unchanged, in the
   * approval request — if the real state moves between this preview
   * and the click, the fingerprint no longer matches and the API
   * refuses to apply, requiring a fresh preview instead. */
  previewToken: string | null;
}

export async function loadVitrineRevisionPreview(): Promise<VitrineRevisionPreview> {
  const decision = await computeVitrineRenewalDecision();
  return buildPreviewFromDecision(decision);
}

export async function buildPreviewFromDecision(decision: VitrineRenewalDecision): Promise<VitrineRevisionPreview> {
  if (decision.blocked) {
    return {
      generatedAt: new Date(),
      blocked: true,
      blockedReason: decision.reason,
      aiSnapshotId: null,
      aiSnapshotReferenceDate: null,
      currentCount: 0,
      recommendedCount: 0,
      rotationBudgetThisWeek: 0,
      rows: [],
      publicationBlockers: [],
      criticNotes: null,
      previewToken: null,
    };
  }

  const retireIds = new Set(decision.toRetire.map((r) => r.merchantListingId));
  const deferredIds = new Set(decision.outrankedDeferredByBudget.map((r) => r.merchantListingId));
  const protectedIds = new Set(decision.outrankedProtected.map((r) => r.merchantListingId));
  const newcomerIds = new Set(decision.newcomers.map((c) => c.merchantListingId));
  const awaitingLinkIds = new Set(decision.entrantsAwaitingLink.map((c) => c.merchantListingId));

  const allIds = new Set([
    ...decision.current.map((c) => c.merchantListingId),
    ...decision.candidates.map((c) => c.merchantListingId),
  ]);
  const links = await prisma.affiliateLinkRegistry.findMany({
    where: { merchantListingId: { in: [...allIds] } },
    select: { merchantListingId: true, status: true },
  });
  const linkByListing = new Map(links.map((l) => [l.merchantListingId, l.status]));

  const rows: VitrineRevisionRow[] = [];

  for (const c of decision.current) {
    const title = c.merchantListing?.canonicalProduct?.title ?? "(sem título)";
    const status: VitrineRevisionRow["status"] = retireIds.has(c.merchantListingId)
      ? "sai_esta_semana"
      : deferredIds.has(c.merchantListingId) || protectedIds.has(c.merchantListingId)
        ? "saida_adiada"
        : "mantido";
    rows.push({
      merchantListingId: c.merchantListingId,
      canonicalProductId: c.canonicalProductId,
      title,
      score: c.score,
      linkStatus: (linkByListing.get(c.merchantListingId) as VitrineRevisionRow["linkStatus"]) ?? "sem_registro",
      status,
    });
  }
  for (const c of decision.candidates) {
    const currentIds = new Set(decision.current.map((r) => r.merchantListingId));
    if (currentIds.has(c.merchantListingId)) continue;
    rows.push({
      merchantListingId: c.merchantListingId,
      canonicalProductId: c.canonicalProductId,
      title: c.title,
      score: c.score,
      linkStatus: (linkByListing.get(c.merchantListingId) as VitrineRevisionRow["linkStatus"]) ?? "sem_registro",
      status: awaitingLinkIds.has(c.merchantListingId) ? "aguardando_link" : newcomerIds.has(c.merchantListingId) ? "entra_esta_semana" : "saida_adiada",
    });
  }

  const publicationBlockers = rows
    .filter((r) => (r.status === "entra_esta_semana" || r.status === "aguardando_link") && r.linkStatus !== "ACTIVE")
    .map((r) => ({
      merchantListingId: r.merchantListingId,
      title: r.title,
      reason: r.linkStatus === "sem_registro" ? "nenhum link de afiliado registrado ainda" : `link com status ${r.linkStatus}, não publicável`,
    }));

  return {
    generatedAt: new Date(),
    blocked: false,
    blockedReason: null,
    aiSnapshotId: decision.aiSnapshotId,
    aiSnapshotReferenceDate: decision.aiSnapshotReferenceDate,
    currentCount: decision.current.length,
    recommendedCount: decision.candidates.length,
    rotationBudgetThisWeek: decision.rotationBudget,
    rows,
    publicationBlockers,
    criticNotes: decision.criticNotes,
    previewToken: decision.fingerprint,
  };
}

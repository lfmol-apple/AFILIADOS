import { prisma } from "@/lib/db";
import { selectVitrineCandidates, type VitrineCandidate } from "@/lib/services/vitrine-selection";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";

/**
 * Read-only preview of what the REAL selection engine recommends right
 * now, compared against the REAL persisted Vitrine Geral — owner's
 * authorization, 2026-11-22 ("Operação Cérebro Comercial", item 2:
 * "conecte o cérebro comercial à seleção da vitrine... implemente uma
 * prévia de alterações com aprovação explícita").
 *
 * Deliberately does NOT reimplement jobs/vitrine-renew.ts's rotation
 * budget / minimum-observation protection / invalid-vs-outranked split
 * — that logic is real, tested, and owns real production safety
 * guarantees; duplicating it here would risk drift between what this
 * preview shows and what approving actually does. This preview shows
 * the UNPROTECTED recommendation (what the engine would pick with no
 * limits at all) — approving still runs the real, unmodified
 * `runVitrineRenewJob()`, which applies its own real protections on
 * top. The preview is honest about this gap, never silent about it.
 */
export interface VitrineRevisionRow {
  merchantListingId: string;
  canonicalProductId: string | null;
  title: string;
  score: number | null;
  linkStatus: "ACTIVE" | "PENDING" | "INVALID" | "DISABLED" | "sem_registro";
  status: "mantido" | "sugerido_entrada" | "sugerido_saida";
}

export interface VitrineRevisionPreview {
  generatedAt: Date;
  currentCount: number;
  recommendedCount: number;
  rows: VitrineRevisionRow[];
  publicationBlockers: { merchantListingId: string; title: string; reason: string }[];
}

export async function loadVitrineRevisionPreview(): Promise<VitrineRevisionPreview> {
  const vitrineId = await getLegacyVitrineId();
  const [current, selectResult] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { vitrineId, status: "ACTIVE" },
      include: { merchantListing: { include: { canonicalProduct: { select: { title: true } } } } },
    }),
    selectVitrineCandidates(30),
  ]);

  const currentIds = new Set(current.map((c) => c.merchantListingId));
  const recommendedIds = new Set(selectResult.candidates.map((c: VitrineCandidate) => c.merchantListingId));

  const allIds = new Set([...currentIds, ...recommendedIds]);
  const links = await prisma.affiliateLinkRegistry.findMany({
    where: { merchantListingId: { in: [...allIds] } },
    select: { merchantListingId: true, status: true },
  });
  const linkByListing = new Map(links.map((l) => [l.merchantListingId, l.status]));

  const rows: VitrineRevisionRow[] = [];

  for (const c of current) {
    const inRecommended = recommendedIds.has(c.merchantListingId);
    rows.push({
      merchantListingId: c.merchantListingId,
      canonicalProductId: c.canonicalProductId,
      title: c.merchantListing.canonicalProduct?.title ?? "(sem título)",
      score: c.score,
      linkStatus: (linkByListing.get(c.merchantListingId) as VitrineRevisionRow["linkStatus"]) ?? "sem_registro",
      status: inRecommended ? "mantido" : "sugerido_saida",
    });
  }
  for (const c of selectResult.candidates) {
    if (currentIds.has(c.merchantListingId)) continue;
    rows.push({
      merchantListingId: c.merchantListingId,
      canonicalProductId: c.canonicalProductId,
      title: c.title,
      score: c.score,
      linkStatus: (linkByListing.get(c.merchantListingId) as VitrineRevisionRow["linkStatus"]) ?? "sem_registro",
      status: "sugerido_entrada",
    });
  }

  const publicationBlockers = rows
    .filter((r) => r.status !== "sugerido_saida" && r.linkStatus !== "ACTIVE")
    .map((r) => ({
      merchantListingId: r.merchantListingId,
      title: r.title,
      reason: r.linkStatus === "sem_registro" ? "nenhum link de afiliado registrado ainda" : `link com status ${r.linkStatus}, não publicável`,
    }));

  return {
    generatedAt: new Date(),
    currentCount: current.length,
    recommendedCount: selectResult.candidates.length,
    rows,
    publicationBlockers,
  };
}

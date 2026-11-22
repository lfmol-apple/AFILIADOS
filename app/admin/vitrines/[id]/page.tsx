import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { previewSelectionForVitrine } from "@/lib/services/vitrine-manager";
import { VitrineLifecycleActions } from "@/components/admin/vitrine-lifecycle-actions";
import { EditVitrineForm } from "@/components/admin/edit-vitrine-form";
import type { PagePropsWithParams } from "@/lib/next-route-types";
import type { VitrineStatus } from "@/lib/services/vitrine-manager";

export const metadata: Metadata = { title: "Vitrine — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

/**
 * Owner's authorization, 2026-11-22 ("Visualização dos produtos
 * selecionados" + "identificação de produtos indisponíveis por
 * exclusividade" + "prévia comercial antes da ativação"). Reuses
 * previewSelectionForVitrine() unchanged — never re-implements the
 * ranking/diversity/exclusion policy here, only renders its real
 * output, including WHICH other vitrine already holds a blocked
 * candidate (resolved to a real name, never just an opaque id).
 */
export default async function VitrineAdminDetailPage(props: PagePropsWithParams<{ id: string }>) {
  const { id } = await props.params;
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const vitrine = await prisma.vitrine.findUnique({ where: { id } });
  if (!vitrine) notFound();

  const [active, reserve, retired] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { vitrineId: id, status: "ACTIVE" },
      orderBy: { score: "desc" },
      select: { id: true, merchantListingId: true, score: true, reason: true, groupType: true, activatedAt: true },
    }),
    prisma.vitrineSelection.count({ where: { vitrineId: id, status: "RESERVE" } }),
    prisma.vitrineSelection.count({ where: { vitrineId: id, status: "RETIRED" } }),
  ]);

  // Only a DRAFT or PAUSED vitrine gets a real preview — an ACTIVE one
  // already shows its REAL current selection above; previewing again
  // would just be a confusing, redundant "what-if" against itself.
  const preview =
    vitrine.status === "DRAFT" || vitrine.status === "PAUSED"
      ? await previewSelectionForVitrine(id, vitrine.maxProducts)
      : null;
  const blockedByVitrineIds = preview ? [...new Set(preview.blockedByOtherVitrine.map((b) => b.heldByVitrineId))] : [];
  const blockedByVitrines = blockedByVitrineIds.length
    ? await prisma.vitrine.findMany({ where: { id: { in: blockedByVitrineIds } }, select: { id: true, name: true } })
    : [];
  const vitrineNameById = new Map(blockedByVitrines.map((v) => [v.id, v.name]));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 text-sm sm:px-6">
      <Link href="/admin/vitrines" className="text-brand text-xs font-semibold">
        ← Todas as vitrines
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{vitrine.name}</h1>
          <p className="text-foreground/50 text-xs">
            URL pública:{" "}
            <a href={`/vitrine/${vitrine.slug}`} target="_blank" rel="noreferrer" className="text-brand underline">
              /vitrine/{vitrine.slug}
            </a>
          </p>
        </div>
        <span className="border-border-subtle rounded-full border px-3 py-1 text-xs font-medium">
          {STATUS_LABEL[vitrine.status] ?? vitrine.status}
        </span>
      </div>

      <div className="mt-4">
        <VitrineLifecycleActions vitrineId={vitrine.id} status={vitrine.status as VitrineStatus} />
      </div>

      <div className="mt-6">
        <EditVitrineForm vitrine={{ id: vitrine.id, name: vitrine.name, purpose: vitrine.purpose, maxProducts: vitrine.maxProducts }} />
      </div>

      <h2 className="mt-8 text-base font-bold">
        Produtos ativos ({active.length} de {vitrine.maxProducts})
      </h2>
      {active.length === 0 ? (
        <p className="text-foreground/60 mt-2">
          {vitrine.status === "ACTIVE" ? 'Nenhum produto selecionado ainda — use "Aplicar seleção comercial".' : "—"}
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {active.map((row) => (
            <li key={row.id} className="border-border-subtle flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="truncate">
                [{row.groupType}] score {Math.round(row.score)} — {row.reason}
              </span>
              <span className="text-foreground/40 shrink-0 text-xs">?p={row.id}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-foreground/50 mt-1 text-xs">
        Em reserva: {reserve} · Retirados (histórico): {retired}
      </p>

      {preview && (
        <>
          <h2 className="mt-8 text-base font-bold">Prévia comercial (simulação, nada foi escrito)</h2>
          <p className="text-foreground/60 mt-1 text-xs">
            {preview.eligible.length} candidato(s) real(is) elegível(eis) agora · {preview.blockedByOtherVitrine.length} indisponível(eis) por exclusividade.
          </p>
          <ul className="mt-2 space-y-1">
            {preview.eligible.slice(0, 15).map((c) => (
              <li key={c.merchantListingId} className="border-border-subtle rounded-lg border px-3 py-2">
                [{c.group}] score {Math.round(c.score)} — {c.title.slice(0, 70)}
              </li>
            ))}
          </ul>
          {preview.blockedByOtherVitrine.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Indisponíveis por exclusividade</h3>
              <ul className="mt-2 space-y-1">
                {preview.blockedByOtherVitrine.slice(0, 10).map((b) => (
                  <li key={b.candidate.merchantListingId} className="text-foreground/70 rounded-lg border border-amber-300 px-3 py-2">
                    {b.candidate.title.slice(0, 60)} — já reservado por{" "}
                    <strong>{vitrineNameById.get(b.heldByVitrineId) ?? b.heldByVitrineId}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

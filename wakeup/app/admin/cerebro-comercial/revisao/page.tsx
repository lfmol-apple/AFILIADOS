import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadVitrineRevisionPreview, type VitrineRevisionRow } from "@/lib/services/commercial-intelligence/vitrine-revision-preview";
import { VitrineRenewApproveButton } from "@/components/vitrine-renew-approve-button";

export const metadata: Metadata = {
  title: "Revisão da Vitrine Geral — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const LINK_LABEL: Record<string, string> = {
  ACTIVE: "ativo",
  PENDING: "pendente",
  INVALID: "inválido",
  DISABLED: "desativado",
  sem_registro: "sem link registrado",
};

export default async function RevisaoVitrinePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const preview = await loadVitrineRevisionPreview();

  if (preview.blocked) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-sm">
          <a href="/admin/cerebro-comercial" className="text-brand underline">
            ← Cérebro Comercial
          </a>
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Revisão da Vitrine Geral</h1>
        <div className="mt-4 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p className="font-bold">Bloqueado — nenhuma mudança pode ser aprovada agora.</p>
          <p className="mt-1">{preview.blockedReason}</p>
        </div>
        <p className="mt-3 text-sm">
          <a href="/admin/laboratorio" className="text-brand underline">
            Ir para o Laboratório de Inteligência Comercial →
          </a>
        </p>
      </div>
    );
  }

  const saiEstaSemana = preview.rows.filter((r) => r.status === "sai_esta_semana");
  const saidaAdiada = preview.rows.filter((r) => r.status === "saida_adiada");
  const entraEstaSemana = preview.rows.filter((r) => r.status === "entra_esta_semana");
  const aguardandoLink = preview.rows.filter((r) => r.status === "aguardando_link");
  const mantidos = preview.rows.filter((r) => r.status === "mantido");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/cerebro-comercial" className="text-brand underline">
          ← Cérebro Comercial
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Revisão da Vitrine Geral</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gerado em {preview.generatedAt.toLocaleString("pt-BR")}. Snapshot de IA aplicado: <code>{preview.aiSnapshotId}</code> (
        {preview.aiSnapshotReferenceDate?.toLocaleString("pt-BR")}). Orçamento de rotação restante esta semana:{" "}
        <strong>{preview.rotationBudgetThisWeek}</strong>. Esta é EXATAMENTE a decisão que seria aplicada agora — mesma função que o job
        real usa, nunca uma aproximação.
      </p>
      {preview.criticNotes && (
        <p className="mt-2 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          IA Crítica: {preview.criticNotes}
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Sai esta semana ({saiEstaSemana.length} de {preview.rotationBudgetThisWeek} de orçamento)</h2>
      <RevisionTable rows={saiEstaSemana} />

      <h2 className="mt-8 text-lg font-semibold">Saída adiada por orçamento esgotado ({saidaAdiada.length})</h2>
      <p className="text-foreground/70 mt-1 text-sm">Superados nesta rodada, mas preservados para uma revisão futura — não descartados.</p>
      <RevisionTable rows={saidaAdiada} />

      <h2 className="mt-8 text-lg font-semibold">Entra esta semana ({entraEstaSemana.length})</h2>
      <RevisionTable rows={entraEstaSemana} />

      <h2 className="mt-8 text-lg font-semibold">Aguardando link — preparação sem ativação pública ({aguardandoLink.length})</h2>
      <p className="text-foreground/70 mt-1 text-sm">Recomendados pela IA, mas sem link ativo — vão para reserva, nunca para o público, até terem link.</p>
      <RevisionTable rows={aguardandoLink} />

      <h2 className="mt-8 text-lg font-semibold">Mantidos sem mudança ({mantidos.length})</h2>
      <RevisionTable rows={mantidos} />

      <h2 className="mt-8 text-lg font-semibold">Bloqueios de publicação ({preview.publicationBlockers.length})</h2>
      {preview.publicationBlockers.length === 0 ? (
        <p className="text-foreground/60 mt-2 text-sm">Nenhum bloqueio.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {preview.publicationBlockers.map((b) => (
            <li key={b.merchantListingId}>
              {b.title.slice(0, 60)} — {b.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="text-foreground/50 mt-2 text-xs">
        <a href="/admin/fila-links" className="text-brand underline">
          Ir para geração manual de links →
        </a>
      </p>

      <h2 className="mt-8 text-lg font-semibold">Aprovação explícita</h2>
      <p className="text-foreground/70 mt-1 text-sm">
        Chama o job real (jobs/vitrine-renew.ts), sem alteração nenhuma. Se algo mudar entre esta prévia e o clique, a aprovação é
        recusada e pede uma prévia nova — nunca aplica uma decisão diferente da mostrada aqui.
      </p>
      <div className="mt-3">
        <VitrineRenewApproveButton previewToken={preview.previewToken!} />
      </div>
    </div>
  );
}

function RevisionTable({ rows }: { rows: VitrineRevisionRow[] }) {
  if (rows.length === 0) return <p className="text-foreground/60 mt-2 text-sm">Nenhum produto neste grupo.</p>;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-foreground/60">
            <th className="pr-3 pb-1">Produto</th>
            <th className="pr-3 pb-1">Score</th>
            <th className="pr-3 pb-1">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.merchantListingId} className="border-border-subtle border-t">
              <td className="py-1 pr-3">{r.title.slice(0, 60)}</td>
              <td className="py-1 pr-3">{r.score ?? "—"}</td>
              <td className="py-1 pr-3">{LINK_LABEL[r.linkStatus] ?? r.linkStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

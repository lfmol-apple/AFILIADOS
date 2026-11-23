import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadVitrineRevisionPreview } from "@/lib/services/commercial-intelligence/vitrine-revision-preview";
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
  const mantidos = preview.rows.filter((r) => r.status === "mantido");
  const entrada = preview.rows.filter((r) => r.status === "sugerido_entrada");
  const saida = preview.rows.filter((r) => r.status === "sugerido_saida");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/cerebro-comercial" className="text-brand underline">
          ← Cérebro Comercial
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Revisão da Vitrine Geral</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gerado em {preview.generatedAt.toLocaleString("pt-BR")}. Compara os {preview.currentCount} produtos realmente ativos hoje contra os{" "}
        {preview.recommendedCount} que o motor de seleção recomendaria agora, SEM os limites de rotação semanal e proteção de observação
        mínima que o job real ainda aplica — aprovar não troca os 30 de uma vez, aplica o mesmo orçamento de sempre.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Sugeridos para saída ({saida.length})</h2>
      <RevisionTable rows={saida} />

      <h2 className="mt-8 text-lg font-semibold">Sugeridos para entrada ({entrada.length})</h2>
      <RevisionTable rows={entrada} />

      <h2 className="mt-8 text-lg font-semibold">Mantidos ({mantidos.length})</h2>
      <RevisionTable rows={mantidos} />

      <h2 className="mt-8 text-lg font-semibold">Bloqueios de publicação ({preview.publicationBlockers.length})</h2>
      {preview.publicationBlockers.length === 0 ? (
        <p className="text-foreground/60 mt-2 text-sm">Nenhum bloqueio — todo sugerido tem link ativo.</p>
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
        Chama o job real (jobs/vitrine-renew.ts), sem alteração nenhuma — mesmas proteções de sempre. Nunca simulado.
      </p>
      <div className="mt-3">
        <VitrineRenewApproveButton />
      </div>
    </div>
  );
}

function RevisionTable({ rows }: { rows: Awaited<ReturnType<typeof loadVitrineRevisionPreview>>["rows"] }) {
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

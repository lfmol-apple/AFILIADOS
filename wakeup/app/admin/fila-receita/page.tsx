import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import {
  formatMoney,
  formatRate,
  formatSold,
  loadMlRevenueQueue,
  type MlRevenueQueueRow,
} from "@/lib/services/ml-revenue-queue";

export const metadata: Metadata = {
  title: "Fila de receita ML — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function StatusBadge({ row }: { row: MlRevenueQueueRow }) {
  const label =
    row.reviewStatus === "ready"
      ? "pronto para revisar"
      : row.reviewStatus === "suspect"
        ? "suspeito"
        : "baixo sinal";
  const tone =
    row.reviewStatus === "ready"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : row.reviewStatus === "suspect"
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export default async function RevenueQueuePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, summary, updatedAt } = await loadMlRevenueQueue();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Fila de receita — Mercado Livre
          </h1>
          <p className="text-foreground/60 mt-2 max-w-3xl text-sm leading-relaxed">
            Triagem dos produtos capturados passivamente no painel de afiliados.
            Esta pagina nao publica produto, nao cria pagina, nao ativa CTA e
            nao grava link afiliado no site.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          Admin
        </a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        <div className="border-border-subtle rounded-lg border p-4">
          <p className="text-foreground/50 text-xs">Itens</p>
          <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-4">
          <p className="text-foreground/50 text-xs">Categorias</p>
          <p className="mt-1 text-2xl font-semibold">{summary.categories}</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-4">
          <p className="text-foreground/50 text-xs">Prontos</p>
          <p className="mt-1 text-2xl font-semibold">{summary.ready}</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-4">
          <p className="text-foreground/50 text-xs">Suspeitos</p>
          <p className="mt-1 text-2xl font-semibold">{summary.suspect}</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-4">
          <p className="text-foreground/50 text-xs">Baixo sinal</p>
          <p className="mt-1 text-2xl font-semibold">{summary.weak}</p>
        </div>
      </div>

      <section className="border-border-subtle mt-8 border-t pt-6">
        <h2 className="text-sm font-semibold">Criterios de prioridade</h2>
        <div className="text-foreground/65 mt-3 grid gap-2 text-xs sm:grid-cols-4">
          <p>Mais vendidos e avaliacao minima boa.</p>
          <p>Maior comissao estimada em reais, nao apenas percentual.</p>
          <p>Badges do painel: Mais vendido, Mais buscado e Ganhos extras.</p>
          <p>Conferencia: titulo precisa bater com o link e itemId.</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Produtos capturados</h2>
          <p className="text-foreground/50 text-xs">
            Ultima captura: {updatedAt ?? "nenhuma"}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-foreground/50 mt-4 text-sm">
            Nenhum produto capturado ainda. Abra uma categoria no Safari e rode a
            captura passiva.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-surface-muted text-foreground/60">
                <tr>
                  <th className="p-3 font-medium">Produto</th>
                  <th className="p-3 font-medium">Categoria</th>
                  <th className="p-3 font-medium">Sinais</th>
                  <th className="p-3 font-medium">Comissao</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border-subtle">
                    <td className="max-w-md p-3 align-top">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand font-medium underline-offset-2 hover:underline"
                      >
                        {row.title}
                      </a>
                      <p className="text-foreground/50 mt-1">
                        {row.itemId ?? "sem itemId"} · posicao{" "}
                        {row.sourcePosition}
                      </p>
                      {row.reviewNotes.length > 0 && (
                        <p className="text-foreground/60 mt-1">
                          {row.reviewNotes.join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="p-3 align-top">{row.sourceCategory}</td>
                    <td className="p-3 align-top">
                      <div className="space-y-1">
                        <p>{row.rating?.toFixed(1) ?? "sem nota"}</p>
                        <p>{formatSold(row.sold)} vendidos</p>
                        {row.badges.length > 0 && (
                          <p className="text-foreground/60">
                            {row.badges.join(" · ")}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="space-y-1">
                        <p>{formatMoney(row.estimatedCommission)}</p>
                        <p className="text-foreground/60">
                          {formatRate(row.commissionRate)} de{" "}
                          {formatMoney(row.price)}
                        </p>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <StatusBadge row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

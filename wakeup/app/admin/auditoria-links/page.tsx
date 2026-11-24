import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { StatCard } from "@/components/admin/dashboard-ui";
import { getMlLinkAudit } from "@/lib/queries/ml-link-audit";

export const metadata: Metadata = {
  title: "Auditoria de links ML — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "sem clique";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

const SOURCE_LABEL: Record<string, string> = {
  MANUAL_ADMIN: "Fila original (Pendências de receita)",
  MANUAL_ADMIN_CATEGORY: "Fila por categoria (/admin/fila-links)",
  API: "Gerado por API (Shopee)",
  LEGACY: "Importado, origem não registrada",
};

export default async function MlLinkAuditPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const audit = await getMlLinkAudit();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Auditoria de links Mercado Livre
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Esta tela não abre links do Mercado Livre. Ela usa só o banco do
        PreçoCaindo para achar links curtos repetidos e priorizar os produtos
        que já receberam clique.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Links ML ativos" value={audit.summary.activeLinks} />
        <StatCard
          label="Links curtos repetidos"
          value={audit.summary.duplicatedAffiliateUrls}
        />
        <StatCard
          label="Produtos afetados por repetição"
          value={audit.summary.duplicatedRows}
        />
        <StatCard
          label="Com clique nos últimos 30d"
          value={audit.summary.clickedLast30d}
        />
      </div>

      <section className="border-border-subtle mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold">Links antigos x links novos</h2>
        <p className="text-foreground/60 mt-1 text-sm">
          Delimitação pedida pelo dono, 2026-09-22: nada muda no banco dos links
          já existentes — a fila por categoria só usa um <code>source</code>{" "}
          diferente (<code>MANUAL_ADMIN_CATEGORY</code>) a partir de agora, para
          os dois grupos ficarem separáveis se algum precisar de correção em
          lote depois.
        </p>
        <div className="mt-3 space-y-1.5">
          {audit.summary.linksBySource.map((row) => (
            <div
              key={row.source}
              className="border-border-subtle flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{SOURCE_LABEL[row.source] ?? row.source}</span>
              <span className="font-semibold">{row.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border-subtle mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold">Duplicatas confirmadas</h2>
        <p className="text-foreground/60 mt-1 text-sm">
          Mesmo link afiliado salvo em mais de um produto. Corrija estes
          primeiro: um deles pode estar mandando o visitante para imagem/produto
          diferente.
        </p>
        <div className="mt-4 space-y-4">
          {audit.duplicates.length === 0 ? (
            <p className="text-foreground/60 text-sm">
              Nenhum link afiliado duplicado encontrado.
            </p>
          ) : (
            audit.duplicates.map((duplicate) => (
              <div
                key={duplicate.affiliateUrl}
                className="border-border-subtle rounded-lg border p-3"
              >
                <p className="text-xs font-semibold">
                  {shortUrl(duplicate.affiliateUrl)}
                </p>
                <ul className="divide-border-subtle mt-2 divide-y">
                  {duplicate.rows.map((row) => (
                    <li
                      key={row.merchantListingId}
                      className="py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <span className="font-medium">{row.title}</span>
                        <span className="text-foreground/60 shrink-0 text-xs">
                          {row.clicksLast30d} cliques 30d · {row.totalClicks}{" "}
                          total · {formatDate(row.lastClickAt)}
                        </span>
                      </div>
                      <p className="text-foreground/50 mt-1 truncate text-xs">
                        Público: {shortUrl(row.publicUrl)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border-border-subtle mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold">Revisar por prioridade</h2>
        <p className="text-foreground/60 mt-1 text-sm">
          Links ML ativos que tiveram clique recente. Use esta ordem para
          refazer links com o fluxo correto, sem auditar tudo de uma vez.
        </p>
        <div className="border-border-subtle mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-foreground/60 text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Cliques</th>
                <th className="px-3 py-2 font-medium">Último</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {audit.priorityReview.map((row) => (
                <tr key={row.merchantListingId}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.title}</p>
                    <p className="text-foreground/50 mt-1 truncate text-xs">
                      {shortUrl(row.affiliateUrl)}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums">
                    {row.clicksLast30d} 30d · {row.totalClicks} total
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatDate(row.lastClickAt)}
                  </td>
                </tr>
              ))}
              {audit.priorityReview.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-foreground/60 px-3 py-4 text-sm"
                  >
                    Nenhum link ML com clique recente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

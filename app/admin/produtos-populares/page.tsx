import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { DashboardGroup } from "@/components/admin/dashboard-ui";
import { getTopClickedProductsMulti } from "@/lib/queries/performance-dashboard";

export const metadata: Metadata = {
  title: "Produtos populares — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const MERCHANT_BADGE: Record<string, string> = {
  MERCADO_LIVRE: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  SHOPEE:
    "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  AMAZON: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const MERCHANT_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "ML",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
};

export default async function PopularProductsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(sessionToken))) {
    return <AdminLoginForm />;
  }

  const rows = await getTopClickedProductsMulti(50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Produtos populares</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Os 50 produtos com mais cliques reais para a loja (nunca visita de
            página, nunca você). Ordenado pelo total desde sempre — um produto
            com histórico não some por causa de um dia fraco.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      <DashboardGroup
        title="Ranking de cliques"
        description="Cliques (7d) e (30d) mostram se o produto ainda está quente; total é desde o primeiro clique registrado."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-176 text-left text-sm">
            <thead>
              <tr className="text-foreground/50 text-xs">
                <th className="pb-2 font-medium">Loja</th>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 text-right font-medium">7d</th>
                <th className="pb-2 text-right font-medium">30d</th>
                <th className="pb-2 text-right font-medium">Total</th>
                <th className="pb-2 font-medium">Primeiro / último clique</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-foreground/50 py-3">
                    Nenhum clique registrado ainda.
                  </td>
                </tr>
              )}
              {rows.map((p, i) => (
                <tr key={i}>
                  <td className="py-2 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${MERCHANT_BADGE[p.merchant]}`}
                    >
                      {MERCHANT_LABEL[p.merchant]}
                    </span>
                  </td>
                  <td className="max-w-72 py-2 align-top">
                    {p.href ? (
                      <a href={p.href} className="text-brand hover:underline">
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </td>
                  <td className="py-2 text-right align-top tabular-nums">
                    {p.clicks7d}
                  </td>
                  <td className="py-2 text-right align-top tabular-nums">
                    {p.clicks30d}
                  </td>
                  <td className="py-2 text-right align-top font-semibold tabular-nums">
                    {p.clicksAllTime}
                  </td>
                  <td className="text-foreground/60 py-2 align-top text-xs whitespace-nowrap">
                    {p.firstClickAt.toLocaleDateString("pt-BR")} –{" "}
                    {p.lastClickAt.toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardGroup>
    </div>
  );
}

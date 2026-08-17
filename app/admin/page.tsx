import type { Metadata } from "next";
import { env } from "@/lib/config/env";
import { getTodayStats, getWeeklyStats } from "@/lib/queries/admin";
import { isPolicyReviewRecent } from "@/lib/amazon/policy-guard";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="text-foreground/50 text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;

  if (env.ADMIN_ACCESS_TOKEN && token !== env.ADMIN_ACCESS_TOKEN) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-foreground/60 mt-2 text-sm">
          Este painel exige um token de acesso. Adicione{" "}
          <code>?token=SEU_TOKEN</code> à URL.
        </p>
      </div>
    );
  }

  const [today, weekly, policyRecent] = await Promise.all([
    getTodayStats(),
    getWeeklyStats(),
    Promise.resolve(isPolicyReviewRecent()),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {!policyRecent && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Políticas Amazon não revisadas há mais de 90 dias. Atualize
          AMAZON_POLICY_REVIEW_DATE após revisar docs/AMAZON_COMPLIANCE.md.
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-foreground/70 text-sm font-semibold">Hoje</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Produtos monitorados"
            value={today.productsMonitored}
          />
          <StatCard
            label="Preços atualizados"
            value={today.pricesUpdatedToday}
          />
          <StatCard
            label="Quedas detectadas"
            value={today.dropsDetectedToday}
          />
          <StatCard label="Páginas publicadas" value={today.pagesPublished} />
          <StatCard label="Páginas rejeitadas" value={today.pagesRejected} />
          <StatCard label="Cliques Amazon" value={today.clicksToday} />
          <StatCard
            label="Erros das automações"
            value={today.automationErrorsToday}
          />
        </div>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Produtos com mais cliques (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topProductsByClicks.length === 0 && (
              <li className="text-foreground/50">Sem cliques ainda.</li>
            )}
            {weekly.topProductsByClicks.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>{row.product?.title ?? "—"}</span>
                <span className="font-medium">{row.clicks}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Páginas com mais cliques (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topPagesByClicks.length === 0 && (
              <li className="text-foreground/50">Sem cliques ainda.</li>
            )}
            {weekly.topPagesByClicks.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {row.pageType}/{row.pageSlug}
                </span>
                <span className="font-medium">{row.clicks}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Categorias mais fortes
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.categoryStrength.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-medium">{c._count.products}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Maiores quedas
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.biggestDrops.length === 0 && (
              <li className="text-foreground/50">Nenhuma queda registrada.</li>
            )}
            {weekly.biggestDrops.map((row) => (
              <li key={row.id} className="flex justify-between">
                <span>{row.product.title}</span>
                <span className="font-medium">
                  {row.dropPercentage?.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:col-span-2">
          <h2 className="text-foreground/70 text-sm font-semibold">
            Jobs com falha (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.failedJobs.length === 0 && (
              <li className="text-foreground/50">Nenhuma falha recente.</li>
            )}
            {weekly.failedJobs.map((run) => (
              <li key={run.id} className="flex justify-between">
                <span>{run.job}</span>
                <span className="text-foreground/50">
                  {run.startedAt.toISOString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { checkCreativeBudget } from "@/lib/services/ai-creative-factory/budget";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — Fábrica de Criativos — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 });

export default async function VitrineCriativosPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const [active, budget, totalSpentAllTime] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
      select: {
        merchantListingId: true,
        merchantListing: { select: { canonicalProduct: { select: { title: true } } } },
      },
    }),
    checkCreativeBudget(),
    prisma.vitrineCreativeSpend.aggregate({ _sum: { amountUsd: true } }),
  ]);

  const creatives = await prisma.vitrineCreative.findMany({
    where: { merchantListingId: { in: active.map((a) => a.merchantListingId) } },
    orderBy: [{ merchantListingId: "asc" }, { version: "desc" }],
  });

  const byProduct = new Map<string, typeof creatives>();
  for (const c of creatives) {
    byProduct.set(c.merchantListingId, [...(byProduct.get(c.merchantListingId) ?? []), c]);
  }
  const titleById = new Map(active.map((a) => [a.merchantListingId, a.merchantListing.canonicalProduct?.title ?? "(sem título)"]));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Fábrica Inteligente de Criativos</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Criativos gerados por IA (edição de imagem real, nunca substituição do produto) + camada programática de
        preço/CTA. Funcionamento automático diário via jobs/vitrine-creative-factory.ts.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border-subtle rounded-lg border p-3">
          <p className="text-xl font-semibold">{usd(budget.spentTodayUsd)}</p>
          <p className="text-foreground/60 text-xs">Gasto hoje (limite {usd(budget.dailyLimitUsd)})</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-3">
          <p className="text-xl font-semibold">{usd(budget.spentThisMonthUsd)}</p>
          <p className="text-foreground/60 text-xs">Gasto este mês (limite {usd(budget.monthlyLimitUsd)})</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-3">
          <p className="text-xl font-semibold">{usd(totalSpentAllTime._sum.amountUsd?.toNumber() ?? 0)}</p>
          <p className="text-foreground/60 text-xs">Gasto total histórico</p>
        </div>
        <div className="border-border-subtle rounded-lg border p-3">
          <p className="text-xl font-semibold">{budget.allowed ? "Dentro do orçamento" : "Bloqueado"}</p>
          <p className="text-foreground/60 text-xs">{budget.reason}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Produtos ativos ({active.length})</h2>
      <ul className="mt-3 space-y-4">
        {active.map((a) => {
          const rows = byProduct.get(a.merchantListingId) ?? [];
          const published = rows.filter((r) => r.publishedAt);
          const latest = rows[0];
          return (
            <li key={a.merchantListingId} className="border-border-subtle rounded-lg border p-3">
              <p className="font-medium text-sm">{titleById.get(a.merchantListingId)}</p>
              {rows.length === 0 ? (
                <p className="text-foreground/50 mt-1 text-xs">Nenhum criativo gerado ainda — aguardando o próximo ciclo da Fábrica.</p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {published.map((c) => (
                      <figure key={c.id} className="w-28">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.finalImageUrl} alt="" className="w-28 rounded border border-border-subtle object-cover" />
                        <figcaption className="text-foreground/50 mt-1 text-[10px]">
                          {c.kind} · v{c.version}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-foreground/70 sm:grid-cols-4">
                    <div>
                      <dt className="inline text-foreground/50">Status: </dt>
                      <dd className="inline">{latest?.qualityStatus}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/50">Versão: </dt>
                      <dd className="inline">v{latest?.version}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/50">Custo: </dt>
                      <dd className="inline">{latest?.costUsd != null ? usd(latest.costUsd.toNumber()) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/50">Gerado: </dt>
                      <dd className="inline">{latest?.generatedAt.toLocaleDateString("pt-BR")}</dd>
                    </div>
                  </dl>
                  {latest?.qualityNotes && <p className="text-foreground/50 mt-1 text-xs italic">{latest.qualityNotes}</p>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

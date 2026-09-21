import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { rankAllForLinking } from "@/lib/services/ml-panel-queue";

export const metadata: Metadata = {
  title: "Fila de links — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function loadSiteSlugs(): Promise<string[]> {
  const [canonical, listings] = await Promise.all([
    prisma.canonicalProduct.findMany({
      where: { publicSlug: { not: null } },
      select: { publicSlug: true },
    }),
    prisma.merchantListing.findMany({
      where: { slug: { not: null } },
      select: { slug: true },
    }),
  ]);
  return [
    ...canonical.map((c) => c.publicSlug!),
    ...listings.map((l) => l.slug!),
  ];
}

export default async function LinkQueuePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { toLink, onSite } = rankAllForLinking(
    ML_PANEL_PICKS,
    await loadSiteSlugs(),
  );
  const recommended = toLink.filter((e) => e.recommended).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Fila para gerar link (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Todos os produtos colados do painel de afiliados estão aqui. No painel,
        procure o título e clique em <strong>Compartilhar</strong> para gerar o
        link, depois cadastre-o. A ordem coloca primeiro a maior comissão em
        reais, ponderada pela força de venda (mais vendidos). {recommended}{" "}
        recomendados, {toLink.length - recommended} abaixo das regras (marcados
        ↓), {onSite.length} já estão no site.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-foreground/60 border-border-subtle border-b text-xs">
            <tr>
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Comissão</th>
              <th className="py-2 pr-3">Ganho/venda</th>
              <th className="py-2 pr-3">Vendas</th>
              <th className="py-2 pr-3">Preço</th>
              <th className="py-2 pr-3">Produto</th>
              <th className="py-2">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {toLink.map(
              ({ pick, earningPerSale, recommended: rec, notes }, i) => (
                <tr
                  key={pick.title}
                  className={`border-border-subtle border-b align-top ${rec ? "" : "text-foreground/60"}`}
                >
                  <td className="py-2 pr-3">
                    {i + 1}
                    {rec ? "" : " ↓"}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {pct(pick.rate)}
                    {pick.extras ? " ⚡" : ""}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {brl(earningPerSale)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">+{pick.sold}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {brl(pick.price)}
                  </td>
                  <td className="py-2 pr-3">{pick.title}</td>
                  <td className="py-2 text-xs">{notes.join("; ")}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="text-foreground/50 mt-4 text-xs">
        ⚡ = campanha temporária: confira a taxa ao gerar o link.
      </p>
    </div>
  );
}

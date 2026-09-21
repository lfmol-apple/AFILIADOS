import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelPickRow } from "@/components/panel-pick-row";
import { prisma } from "@/lib/db";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { rankAllForLinking } from "@/lib/services/ml-panel-queue";
import { loadRegisteredPanelIds } from "@/lib/services/ml-panel-register";

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

  const [slugs, registered] = await Promise.all([
    loadSiteSlugs(),
    loadRegisteredPanelIds(),
  ]);
  const { toLink, onSite } = rankAllForLinking(ML_PANEL_PICKS, slugs);
  const pending = toLink.filter((e) => !registered.has(e.pick.id));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Fila para gerar link (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Todos os produtos colados do painel de afiliados, do{" "}
        <strong>maior para o menor valor de comissão em reais</strong> por
        venda. No painel, procure o título e clique em{" "}
        <strong>Compartilhar</strong>; cole o link aqui e salve. O sistema
        identifica o produto, busca foto e preço no Mercado Livre e cria a
        página. A linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {pending.length} aguardando link · {registered.size} já salvos por aqui
        · {onSite.length} já estavam no site. ⚡ = campanha temporária (confira
        a taxa ao gerar).
      </p>
      <ul className="mt-6 space-y-3">
        {pending.map(({ pick, earningPerSale, recommended, notes }, i) => (
          <PanelPickRow
            key={pick.id}
            position={i + 1}
            id={pick.id}
            title={pick.title}
            repeated={pick.id !== pick.title}
            rateLabel={pct(pick.rate)}
            extras={pick.extras}
            earningLabel={brl(earningPerSale)}
            soldLabel={
              pick.sold > 0 ? `+${pick.sold} vendidos` : "vendas não informadas"
            }
            priceLabel={brl(pick.price)}
            notes={notes}
            recommended={recommended}
          />
        ))}
      </ul>
    </div>
  );
}

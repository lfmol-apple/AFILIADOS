import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelPickRow } from "@/components/panel-pick-row";
import { loadPanelQueue } from "@/lib/services/ml-panel-queue-data";

export const metadata: Metadata = {
  title: "Fila de links — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const MAX_LISTED = 100;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function LinkQueuePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const {
    pending,
    withoutAddressCount,
    registeredCount,
    onSiteCount,
    issueCount,
  } = await loadPanelQueue();
  // 675+ rows at once made this page heavy; the batch screen is where the
  // bulk of the work happens, so list only the first ones here.
  const shown = pending.slice(0, MAX_LISTED);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Fila para gerar link (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Só os produtos do painel de afiliados que já têm o link genérico do
        produto, primeiro o Top 20 de maior preço (do maior valor de comissão em
        reais para o menor) e depois os demais, dos mais vendidos para os menos
        vendidos e, no mesmo patamar de vendas, do maior valor de comissão em
        reais para o menor. Clique em{" "}
        <strong>1. Copiar endereço + abrir Linkbuilder</strong> e cole o link
        gerado abaixo; ele salva sozinho. O sistema busca foto e preço no
        Mercado Livre e cria a página; a linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {pending.length} aguardando link · {registeredCount} já salvos por aqui
        · {onSiteCount} já estavam no site
        {issueCount > 0 &&
          ` · ${issueCount} retiradas por não poderem virar link`}
        {withoutAddressCount > 0 &&
          ` · ${withoutAddressCount} ocultos por ainda não terem o link genérico`}
        . ⚡ = campanha temporária (confira a taxa ao gerar).
      </p>
      <p className="mt-3">
        <a
          href="/admin/fila-links/lote"
          className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Gerar e colar em lote →
        </a>
      </p>
      {pending.length > shown.length && (
        <p className="text-foreground/60 mt-3 text-xs">
          Mostrando só os {shown.length} primeiros de {pending.length}. Para o
          resto, use <strong>Gerar e colar em lote</strong> (acima), que pega os
          próximos da fila sozinho.
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {shown.map(({ pick, earningPerSale, recommended, notes }, i) => (
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
            productUrl={pick.productUrl}
          />
        ))}
      </ul>
    </div>
  );
}

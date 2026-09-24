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

const pct = (n: number) => `${Math.round(n * 100)}%`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function LinkQueuePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { pending, withoutAddressCount, registeredCount, onSiteCount } =
    await loadPanelQueue();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Fila para gerar link (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Só os produtos do painel de afiliados que já têm o link genérico do
        produto, do maior valor de comissão em reais (com vendas e nota) para o
        menor. Clique em <strong>1. Copiar endereço + abrir Linkbuilder</strong>{" "}
        e cole o link gerado abaixo; ele salva sozinho. O sistema busca foto e
        preço no Mercado Livre e cria a página; a linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {pending.length} aguardando link · {registeredCount} já salvos por aqui
        · {onSiteCount} já estavam no site · {withoutAddressCount} ocultos por
        ainda não terem o link genérico. ⚡ = campanha temporária (confira a
        taxa ao gerar).
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
            productUrl={pick.productUrl}
          />
        ))}
      </ul>
    </div>
  );
}

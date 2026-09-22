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

  const { pending, registeredCount, onSiteCount } = await loadPanelQueue();
  const readyCount = pending.filter((entry) => entry.pick.productUrl).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Fila para gerar link (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Todos os produtos do painel de afiliados: os mais vendidos com nota alta
        vêm primeiro, cada grupo pela maior comissão em reais por venda. No
        painel, procure o título e clique em <strong>Compartilhar</strong>; cole
        o link aqui e salve. O sistema identifica o produto, busca foto e preço
        no Mercado Livre e cria a página. A linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {pending.length} aguardando link · {readyCount} com link genérico pronto
        · {registeredCount} já salvos por aqui · {onSiteCount} já estavam no
        site ·{" "}
        <a
          href="/admin/auditoria-links"
          className="text-brand underline underline-offset-2"
        >
          auditar links antigos
        </a>
        . ⚡ = campanha temporária (confira a taxa ao gerar).
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

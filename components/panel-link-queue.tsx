import { PanelPickRow } from "@/components/panel-pick-row";
import { SubSection } from "@/components/admin/dashboard-ui";
import { loadPanelQueue } from "@/lib/services/ml-panel-queue-data";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * The owner's Mercado Livre affiliate-panel products waiting for a link, in the
 * admin home: best sellers with a good rating first, each by commission in
 * reais. Paste the link generated in the panel and save; the row leaves the list.
 */
export async function PanelLinkQueue({ limit = 300 }: { limit?: number }) {
  const { pending, withoutAddressCount, registeredCount, onSiteCount } =
    await loadPanelQueue();
  // pending only holds rows with a ready generic address (see loadPanelQueue).
  const shown = pending.slice(0, limit);

  return (
    <SubSection title="Pendências de receita — Mercado Livre (fila por comissão)">
      <p className="text-foreground/60 mb-3 text-xs">
        Produtos do painel de afiliados, do maior valor de comissão em reais
        para o menor (empate: mais vendido, depois melhor avaliado), ofertas
        estáveis antes das campanhas temporárias (⚡). No painel, procure o
        título e clique em <strong>Compartilhar</strong>; cole o link aqui e
        salve. O sistema identifica o produto, busca foto e preço e cria a
        página. A linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mb-3 text-xs">
        Mostrando {shown.length} de {pending.length} aguardando link (todos com
        link genérico pronto) · {registeredCount} já salvos · {onSiteCount} já
        estavam no site
        {withoutAddressCount > 0 &&
          ` · ${withoutAddressCount} ocultos sem link genérico`}
        {" · "}
        <a
          href="/admin/fila-links"
          className="text-brand underline underline-offset-2"
        >
          ver a lista completa
        </a>
        . ⚡ = campanha temporária (confira a taxa ao gerar).
      </p>
      <ul className="space-y-3">
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
    </SubSection>
  );
}

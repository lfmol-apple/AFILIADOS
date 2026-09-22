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
  const { pending, registeredCount, onSiteCount } = await loadPanelQueue();
  // Rows with a ready generic product link come first; the rest follow (title only)
  // so the section stays full while their addresses are still being read.
  const ready = pending.filter((e) => e.pick.productUrl);
  const waiting = pending.filter((e) => !e.pick.productUrl);
  const shown = [...ready, ...waiting].slice(0, limit);

  return (
    <SubSection title="Pendências de receita — Mercado Livre (fila por comissão)">
      <p className="text-foreground/60 mb-3 text-xs">
        Produtos do painel de afiliados, do maior valor de comissão em reais
        para o menor, começando pelos mais vendidos com nota alta. No painel,
        procure o título e clique em <strong>Compartilhar</strong>; cole o link
        aqui e salve. O sistema identifica o produto, busca foto e preço e cria
        a página. A linha sai da lista ao salvar.
      </p>
      <p className="text-foreground/60 mb-3 text-xs">
        Mostrando {shown.length} com link genérico pronto (
        {pending.length - ready.length} ainda sem endereço) · {registeredCount}{" "}
        já salvos · {onSiteCount} já estavam no site ·{" "}
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

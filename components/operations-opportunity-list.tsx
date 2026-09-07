import type { OperationsOpportunity } from "@/lib/queries/operations-center";

/**
 * Read-only rows for /admin's "Oportunidades de hoje" — Server Component
 * (no "use client": see components/ml-affiliate-queue-item.tsx's incident
 * comment for why that matters here too). The interactive "paste the link"
 * action stays in MlAffiliateQueueItem/ml-affiliate-links API route; this
 * component never writes anything.
 */
export function OperationsOpportunityList({ items }: { items: OperationsOpportunity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-foreground/50 text-sm">
        Nenhuma oportunidade com MonetizationScore ainda — rode os ciclos de
        coleta (Shopee/Mercado Livre) para popular esta lista.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-220 text-left text-sm">
        <thead>
          <tr className="text-foreground/50 text-xs">
            <th className="pb-2 font-medium">Produto</th>
            <th className="pb-2 font-medium">Marketplace</th>
            <th className="pb-2 font-medium">Preço</th>
            <th className="pb-2 font-medium">Comissão</th>
            <th className="pb-2 font-medium">Demanda</th>
            <th className="pb-2 font-medium">Score</th>
            <th className="pb-2 font-medium">Link</th>
            <th className="pb-2 font-medium">Ação recomendada</th>
          </tr>
        </thead>
        <tbody className="divide-border-subtle divide-y">
          {items.map((item) => (
            <tr key={item.merchantListingId}>
              <td className="max-w-70 py-2 pr-3">
                <div className="flex items-center gap-2">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  )}
                  <span className="truncate">{item.title}</span>
                </div>
              </td>
              <td className="py-2 pr-3">
                {item.merchant === "SHOPEE" ? "Shopee" : "Mercado Livre"}
              </td>
              <td className="py-2 pr-3">
                {item.price !== null
                  ? item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "—"}
              </td>
              <td className="py-2 pr-3">
                {item.commissionRate !== null
                  ? `${(item.commissionRate * 100).toFixed(1)}%`
                  : "—"}
              </td>
              <td className="py-2 pr-3">
                {item.soldQuantity !== null
                  ? `${item.soldQuantity} vendidos`
                  : item.bestsellerRank !== null
                    ? `#${item.bestsellerRank} ranking`
                    : "—"}
              </td>
              <td className="py-2 pr-3 font-medium">
                {item.monetizationScore ?? "—"}
                <span className="text-foreground/50 font-normal">
                  {" "}
                  ({(item.monetizationConfidence * 100).toFixed(0)}%)
                </span>
              </td>
              <td className="py-2 pr-3">
                {item.linkStatus === "ACTIVE" ? (
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    Ativo
                  </span>
                ) : item.linkStatus === "PENDING_HUMAN" ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Pendente
                  </span>
                ) : (
                  <span className="text-foreground/50">Sem link</span>
                )}
              </td>
              <td className="py-2 text-xs">
                {item.linkStatus === "ACTIVE" && item.ctaHref ? (
                  <a href={item.ctaHref} target="_blank" rel="noopener noreferrer" className="text-brand font-medium underline">
                    Ver CTA →
                  </a>
                ) : (
                  item.recommendedAction
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

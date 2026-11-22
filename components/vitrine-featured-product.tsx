import { ProductImage } from "@/components/product-image";
import { formatCurrency } from "@/lib/format";
import type { VitrinePublicProduct } from "@/lib/queries/vitrine-public";

/**
 * Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
 * Inteligentes", Etapa 3: "produto anunciado em destaque no topo").
 * Deliberately a SEPARATE, small component from components/unified-
 * offer-card.tsx — that one forces `target="_blank"` for Mercado Livre
 * (an existing, site-wide, already-approved convention for the general
 * /ofertas grid, never overridden here). The owner's Pixel-flow
 * requirement (B5, Etapa 5 prep) is specific to THIS one featured
 * product — the literal thing a paid Meta ad click lands on — and
 * explicitly says "não obrigar a abertura em nova aba." Reusing the
 * grid card as-is for this one case would have silently reintroduced
 * that conflict.
 */
export function VitrineFeaturedProduct({ product }: { product: VitrinePublicProduct }) {
  const discount =
    product.discountPercent !== null && product.discountPercent > 0 ? Math.round(product.discountPercent * 100) : null;

  return (
    <div
      data-screenshot-card
      className="bg-surface mb-8 overflow-hidden rounded-3xl border border-border-subtle shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:grid sm:grid-cols-2"
    >
      <div className="bg-surface-muted relative aspect-square w-full sm:aspect-auto">
        <ProductImage src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" iconClassName="h-16 w-16" />
        {discount !== null && (
          <span className="absolute top-4 left-4 rounded-full bg-[#E8336D] px-4 py-2 text-sm font-bold text-white shadow">
            -{discount}% na loja
          </span>
        )}
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-brand text-xs font-bold tracking-wide uppercase">Produto em destaque</p>
        <h1 className="mt-1 text-xl leading-tight font-bold sm:text-2xl">{product.title}</h1>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-extrabold">{formatCurrency(product.currentPrice!, "BRL")}</span>
          {product.referencePrice !== null && product.referencePrice > product.currentPrice! && (
            <span className="text-foreground/40 text-lg line-through">{formatCurrency(product.referencePrice, "BRL")}</span>
          )}
        </div>
        {/* No `target`/`rel` override here — plain, same-tab navigation,
            same real href the grid card below uses (the Vitrine's own
            vitrinedinamica link, never altered). */}
        <a
          href={product.href!}
          className="mt-6 block rounded-full bg-[#1A1A2E] py-4 text-center text-base font-bold text-white"
        >
          Ver no Mercado Livre →
        </a>
      </div>
    </div>
  );
}

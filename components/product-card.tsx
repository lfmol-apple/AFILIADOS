import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { OpportunityBadge } from "@/components/opportunity-badge";
import type { ProductListItem } from "@/lib/queries/products";

export function ProductCard({ product }: { product: ProductListItem }) {
  const offer = product.offers[0];
  const score = product.opportunityScore;
  const insufficientHistory = (product.priceStats?.dataPointCount ?? 0) < 3;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group border-border-subtle bg-background flex flex-col overflow-hidden rounded-xl border transition hover:shadow-md"
    >
      <div className="bg-surface-muted flex aspect-square w-full items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mock/demo image URLs are not from an allow-listed remote host
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-foreground/40 text-xs">Sem imagem</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="text-foreground/50 text-xs tracking-wide uppercase">
            {product.category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">
          {product.title}
        </h3>
        {offer && (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <span className="text-lg font-semibold">
              {formatCurrency(Number(offer.price), offer.currency)}
            </span>
            {offer.discountPercentage != null &&
              offer.discountPercentage > 0 && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  -{Math.round(offer.discountPercentage)}%
                </span>
              )}
          </div>
        )}
        {score && (
          <div>
            <OpportunityBadge
              score={score.score}
              insufficientHistory={insufficientHistory}
              size="sm"
            />
          </div>
        )}
      </div>
    </Link>
  );
}

import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { ProductImage } from "@/components/product-image";
import { priceEvidenceLine } from "@/lib/services/price-evidence";
import type { ProductListItem } from "@/lib/queries/products";

/**
 * PRODUTO → PREÇO → VEREDITO → EVIDÊNCIAS, compressed into a scannable
 * card: image, title, current price (+ previous price and drop when
 * available), Score, and — only when the underlying stats actually
 * support it — one short evidence line. Never invents a rating, review
 * count, or spec that isn't in the data.
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const offer = product.offers[0];
  const score = product.opportunityScore;
  const insufficientHistory = (product.priceStats?.dataPointCount ?? 0) < 3;
  const avg30d = product.priceStats?.avg30d
    ? Number(product.priceStats.avg30d)
    : null;
  const evidence =
    offer && !insufficientHistory
      ? priceEvidenceLine(Number(offer.price), avg30d)
      : null;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group border-border-subtle bg-background flex flex-col overflow-hidden rounded-xl border transition hover:shadow-md"
    >
      <div className="bg-surface-muted aspect-square w-full overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          categoryName={product.category?.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
          iconClassName="h-10 w-10"
        />
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
          <div className="mt-auto pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-lg font-semibold">
                {formatCurrency(Number(offer.price), offer.currency)}
              </span>
              {offer.originalPrice &&
                Number(offer.originalPrice) > Number(offer.price) && (
                  <span className="text-foreground/40 text-xs line-through">
                    {formatCurrency(Number(offer.originalPrice), offer.currency)}
                  </span>
                )}
              {offer.discountPercentage != null &&
                offer.discountPercentage > 0 && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ↓{Math.round(offer.discountPercentage)}%
                  </span>
                )}
            </div>

            {score && (
              <div className="mt-2">
                <OpportunityBadge
                  score={score.score}
                  insufficientHistory={insufficientHistory}
                  size="sm"
                />
              </div>
            )}

            {evidence && (
              <p className="text-foreground/50 mt-1.5 text-xs">{evidence}</p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

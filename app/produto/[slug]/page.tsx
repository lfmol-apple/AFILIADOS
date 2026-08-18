import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getSimilarProducts } from "@/lib/queries/products";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import { formatCurrency, formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OpportunityBadge } from "@/components/opportunity-badge";
import { AmazonCta } from "@/components/amazon-cta";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { ProductCard } from "@/components/product-card";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { siteConfig } from "@/lib/config/site";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";
import { isProductPageIndexable } from "@/lib/seo/indexability";

export const revalidate = 900;

async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product || !product.active) return null;

  const offer = product.offers[0];
  if (!offer || !product.priceStats) return null;

  const stats = {
    currentPrice: Number(product.priceStats.currentPrice),
    lowestPrice: Number(product.priceStats.lowestPrice),
    highestPrice: Number(product.priceStats.highestPrice),
    avg7d: product.priceStats.avg7d ? Number(product.priceStats.avg7d) : null,
    avg30d: product.priceStats.avg30d
      ? Number(product.priceStats.avg30d)
      : null,
    avg90d: product.priceStats.avg90d
      ? Number(product.priceStats.avg90d)
      : null,
    dropPercentage: product.priceStats.dropPercentage,
    distanceFromLow: product.priceStats.distanceFromLow ?? 0,
    historicalPosition: product.priceStats.historicalPosition ?? 0,
    dataPointCount: product.priceStats.dataPointCount,
    coverageDays: product.priceStats.coverageDays,
  };

  const score = calculateOpportunityScore({
    currentPrice: Number(offer.price),
    listedDiscountPercentage: offer.discountPercentage,
    rating: product.rating,
    reviewCount: product.reviewCount,
    availability: offer.availability,
    stats,
  });

  return { product, offer, stats, score };
}

export async function generateMetadata(
  props: PageProps<"/produto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadProduct(slug);
  if (!data) return {};

  const { product, offer, stats } = data;
  const title = `${product.title} — vale a pena comprar agora?`;
  const description = `Veja o histórico de preço e o Score PreçoCaindo de ${product.title}, atualmente por ${formatCurrency(Number(offer.price), offer.currency)}.`;

  const specCount = product.specifications && typeof product.specifications === "object"
    ? Object.keys(product.specifications as Record<string, unknown>).length
    : 0;
  const indexable = isProductPageIndexable({
    coverageDays: stats.coverageDays,
    hasDescription: Boolean(product.description),
    specCount,
  });

  return {
    title,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const data = await loadProduct(slug);
  if (!data) notFound();

  const { product, offer, stats, score } = data;
  const specs =
    (product.specifications as Record<
      string,
      string | number | boolean
    > | null) ?? {};
  const specEntries = Object.entries(specs);
  const similar = await getSimilarProducts(product.categoryId, product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.imageUrl ?? undefined,
    description: product.description ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    aggregateRating:
      product.rating && product.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: offer.currency,
      price: Number(offer.price),
      availability:
        offer.availability === "IN_STOCK"
          ? "https://schema.org/InStock"
          : offer.availability === "OUT_OF_STOCK"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/LimitedAvailability",
      url: `${siteConfig.url}/go/amazon/${product.asin}`,
      seller: { "@type": "Organization", name: "Amazon.com.br" },
    },
  };

  const breadcrumbItems = [
    { label: "Início", href: "/" },
    ...(product.category
      ? [{ label: product.category.name, href: `/categorias/${product.category.slug}` }]
      : []),
    { label: product.title },
  ];
  const breadcrumbList = buildBreadcrumbList(breadcrumbItems);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="product" pageSlug={product.slug} productId={product.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />

      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 grid gap-8 sm:grid-cols-2">
        <div className="bg-surface-muted flex aspect-square items-center justify-center overflow-hidden rounded-xl">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- mock/demo image URL
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-foreground/40 text-sm">Sem imagem</span>
          )}
        </div>

        <div>
          <h1 className="text-2xl leading-tight font-semibold">
            {product.title}
          </h1>
          {product.brand && (
            <p className="text-foreground/60 mt-1 text-sm">{product.brand}</p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatCurrency(Number(offer.price), offer.currency)}
            </span>
            {offer.originalPrice &&
              Number(offer.originalPrice) > Number(offer.price) && (
                <span className="text-foreground/40 text-sm line-through">
                  {formatCurrency(Number(offer.originalPrice), offer.currency)}
                </span>
              )}
          </div>
          <p className="text-foreground/50 mt-1 text-xs">
            Preço verificado em {formatDate(new Date())}
          </p>

          <div className="mt-4">
            <OpportunityBadge
              score={score.score}
              insufficientHistory={score.insufficientHistory}
            />
          </div>

          {offer.availability === "OUT_OF_STOCK" && (
            <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
              Indisponível no momento na Amazon.
            </p>
          )}

          <AmazonCta
            asin={product.asin}
            pageType="product"
            pageSlug={product.slug}
            className="mt-6"
          />
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-lg font-semibold">O preço está bom?</h2>
        <div className="text-foreground/80 mt-3 space-y-2 text-sm leading-relaxed">
          <p>
            O preço atual é {formatCurrency(stats.currentPrice, offer.currency)}
            {stats.avg30d
              ? `, o que está ${stats.currentPrice < stats.avg30d ? "abaixo" : "acima"} da média dos últimos 30 dias (${formatCurrency(stats.avg30d, offer.currency)}).`
              : "."}
          </p>
          <p>
            {stats.coverageDays < 30
              ? `Estamos acompanhando este produto há ${stats.coverageDays} dia(s) — ainda é pouco tempo para afirmar que este é o menor preço histórico.`
              : `Este histórico cobre ${stats.coverageDays} dias de observação direta do PreçoCaindo, com preço mínimo de ${formatCurrency(stats.lowestPrice, offer.currency)} e máximo de ${formatCurrency(stats.highestPrice, offer.currency)}.`}
          </p>
        </div>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">Histórico de preço</h2>
        <div className="border-border-subtle mt-3 rounded-xl border p-4">
          <PriceHistoryChart
            points={product.priceHistory.map((h) => ({
              price: Number(h.price),
              observedAt: h.observedAt,
            }))}
            currency={offer.currency}
          />
        </div>
      </section>

      {product.description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold">Para quem faz sentido</h2>
          <p className="text-foreground/80 mt-3 text-sm leading-relaxed">
            {product.description}
          </p>
        </section>
      )}

      {specEntries.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold">Especificações</h2>
          <dl className="divide-border-subtle border-border-subtle mt-3 divide-y rounded-xl border text-sm">
            {specEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-foreground/60">{key}</dt>
                <dd className="text-right font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Produtos parecidos</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="border-border-subtle mt-10 max-w-3xl border-t pt-6">
        <h2 className="text-foreground/70 text-sm font-semibold">
          Metodologia
        </h2>
        <p className="text-foreground/50 mt-2 text-xs leading-relaxed">
          O Score PreçoCaindo é calculado com metodologia própria a partir do
          histórico de preços coletado diretamente pelo PreçoCaindo — não é uma
          recomendação da Amazon. Avaliação e número de avaliações, quando
          exibidos, vêm da Amazon. Preços e disponibilidade podem mudar a
          qualquer momento.
        </p>
      </section>
    </div>
  );
}

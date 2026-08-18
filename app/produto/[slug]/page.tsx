import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getSimilarProducts } from "@/lib/queries/products";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import { calculateDecision } from "@/lib/services/decision-engine";
import { priceEvidenceLine } from "@/lib/services/price-evidence";
import { formatCurrency, formatDate } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScorePanel } from "@/components/score-panel";
import { AmazonCta } from "@/components/amazon-cta";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { siteConfig } from "@/lib/config/site";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";
import { isProductPageIndexable } from "@/lib/seo/indexability";
import Link from "next/link";

export const revalidate = 900;

/**
 * getProductBySlug() already applies the active + dataSource visibility
 * filter at the query level (lib/queries/products.ts) — a MANUAL_VERIFIED
 * product can legitimately be visible even when isPublicCatalogSafeToShow()
 * is false (e.g. AMAZON_PROVIDER=mock in production), so this function must
 * not re-apply that check itself. What it DOES still need to handle: a real,
 * publishable product that has an ASIN and editorial content but no Offer
 * yet — no scraping/Creators API means price/availability may simply not
 * exist. offer/stats are null in that case (decision still resolves to
 * INSUFFICIENT_DATA); the page renders an
 * honest "ainda estamos acompanhando" state instead of 404ing (project
 * brief Sprint 6 section 7 — never invent a price/history to fill the gap).
 */
async function loadProduct(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product) return null;

  const offer = product.offers[0];
  if (!offer || !product.priceStats) {
    return {
      product,
      offer: null,
      stats: null,
      decision: calculateDecision({ hasOffer: false, stats: null, opportunity: null }),
    };
  }

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

  const opportunity = calculateOpportunityScore({
    currentPrice: Number(offer.price),
    listedDiscountPercentage: offer.discountPercentage,
    rating: product.rating,
    reviewCount: product.reviewCount,
    availability: offer.availability,
    stats,
  });

  // calculateOpportunityScore()'s output also feeds the persisted
  // OpportunityScore used to rank the homepage/ofertas listings — reused
  // here only as an input signal. calculateDecision() is the thing that
  // actually answers "vale a pena comprar agora?" for this visitor; the
  // two must never be treated as the same number (docs/ARCHITECTURE.md).
  const decision = calculateDecision({ hasOffer: true, stats, opportunity });

  return { product, offer, stats, decision };
}

export async function generateMetadata(
  props: PageProps<"/produto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadProduct(slug);
  if (!data) return {};

  const { product, offer, stats } = data;
  const title = offer
    ? `${product.title} — vale a pena comprar agora?`
    : `${product.title} — PreçoCaindo`;
  const description = offer
    ? `Veja o histórico de preço e o Score PreçoCaindo de ${product.title}, atualmente por ${formatCurrency(Number(offer.price), offer.currency)}.`
    : `Estamos começando a acompanhar o preço de ${product.title} na Amazon. Veja os detalhes no PreçoCaindo.`;

  const specCount =
    product.specifications && typeof product.specifications === "object"
      ? Object.keys(product.specifications as Record<string, unknown>).length
      : 0;
  const indexable = isProductPageIndexable({
    coverageDays: stats?.coverageDays ?? 0,
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

  const { product, offer, stats, decision } = data;
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
    // Omitted entirely (never fabricated) when there's no verified Offer
    // yet — schema.org's Product.offers is optional, and an invented price
    // would violate the "never fabricate to fill a field" rule.
    offers: offer
      ? {
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
        }
      : undefined,
  };

  const breadcrumbItems = [
    { label: "Início", href: "/" },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href: `/categorias/${product.category.slug}`,
          },
        ]
      : []),
    { label: product.title },
  ];
  const breadcrumbList = buildBreadcrumbList(breadcrumbItems);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon
        pageType="product"
        pageSlug={product.slug}
        productId={product.id}
      />
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
        <div className="bg-surface-muted aspect-square overflow-hidden rounded-xl">
          <ProductImage
            src={product.imageUrl}
            alt={product.title}
            categoryName={product.category?.name}
            className="h-full w-full object-cover"
            iconClassName="h-16 w-16"
          />
        </div>

        <div>
          <h1 className="text-2xl leading-tight font-semibold">
            {product.title}
          </h1>
          {product.brand && (
            <p className="text-foreground/60 mt-1 text-sm">{product.brand}</p>
          )}

          {offer ? (
            <>
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

              {offer.availability === "OUT_OF_STOCK" && (
                <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                  Indisponível no momento na Amazon.
                </p>
              )}
            </>
          ) : (
            <p className="text-foreground/60 mt-4 text-sm leading-relaxed">
              Ainda estamos acompanhando este produto. Assim que tivermos
              preço e histórico verificados, eles aparecem aqui.
            </p>
          )}

          <div className="mt-5">
            <ScorePanel
              decision={decision}
              evidence={
                stats ? priceEvidenceLine(stats.currentPrice, stats.avg30d) : null
              }
            />
            <Link
              href="/transparencia"
              className="text-brand mt-2 inline-block text-xs hover:underline"
            >
              Como calculamos?
            </Link>
          </div>

          <AmazonCta
            asin={product.asin}
            pageType="product"
            pageSlug={product.slug}
            className="mt-6"
          />
        </div>
      </div>

      {stats && offer && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-lg font-semibold">O preço está bom?</h2>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-foreground/50 text-xs">Hoje</dt>
              <dd className="font-semibold">
                {formatCurrency(stats.currentPrice, offer.currency)}
              </dd>
            </div>
            {stats.avg30d != null && (
              <div>
                <dt className="text-foreground/50 text-xs">Média 30 dias</dt>
                <dd className="font-semibold">
                  {formatCurrency(stats.avg30d, offer.currency)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-foreground/50 text-xs">Menor observado</dt>
              <dd className="font-semibold">
                {formatCurrency(stats.lowestPrice, offer.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50 text-xs">Maior observado</dt>
              <dd className="font-semibold">
                {formatCurrency(stats.highestPrice, offer.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50 text-xs">Acompanhamos</dt>
              <dd className="font-semibold">
                {stats.coverageDays} dia{stats.coverageDays === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>

          <div className="text-foreground/80 mt-4 space-y-2 text-sm leading-relaxed">
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
      )}

      {stats && offer && product.priceHistory.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold">Histórico de preço</h2>
          <div className="border-border-subtle mt-3 rounded-xl border p-4">
            <PriceHistoryChart
              points={product.priceHistory.map((h) => ({
                price: Number(h.price),
                observedAt: h.observedAt,
              }))}
              currency={offer.currency}
              average={stats.avg30d}
            />
          </div>
        </section>
      )}

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

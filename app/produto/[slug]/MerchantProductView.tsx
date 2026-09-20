import { Breadcrumbs } from "@/components/breadcrumbs";
import { MerchantCta } from "@/components/merchant-cta";
import { ProductImage } from "@/components/product-image";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { formatCurrency, formatDate } from "@/lib/format";
import { siteConfig } from "@/lib/config/site";
import { buildBreadcrumbList, jsonLdScriptPayload } from "@/lib/seo/structured-data";
import type { PublicMerchantProductViewModel, RelatedMerchantProduct } from "@/lib/queries/public-product";
import type { RadarEvent, RadarEventType } from "@/lib/services/radar";
import type { SimilarOffers } from "@/lib/queries/similar-offers";
import { offerCategoryLabel } from "@/lib/offers/categories";
import { guideForCategory } from "@/lib/product/category-guides";
import { PRICE_POSITION_TEXT, summarizePriceHistory } from "@/lib/product/price-summary";

const MERCHANT_LABEL: Record<PublicMerchantProductViewModel["source"], string> = {
  MERCADO_LIVRE: "no Mercado Livre",
  SHOPEE: "na Shopee",
};

// Mercado Livre's own real seller_reputation.level_id scale — same source
// already scoring offerQuality (lib/services/ml-offer-quality.ts), shown
// honestly either way: a visitor deserves to see a weak reputation too,
// not just the good ones.
const REPUTATION_LABEL: Record<string, { label: string; tone: string }> = {
  "5_green": { label: "Vendedor com reputação alta no Mercado Livre", tone: "text-emerald-700 dark:text-emerald-400" },
  "4_light_green": { label: "Vendedor com boa reputação no Mercado Livre", tone: "text-emerald-700 dark:text-emerald-400" },
  "3_yellow": { label: "Vendedor com reputação mediana no Mercado Livre", tone: "text-amber-700 dark:text-amber-400" },
  "2_orange": { label: "Vendedor com reputação baixa no Mercado Livre", tone: "text-amber-700 dark:text-amber-400" },
  "1_red": { label: "Vendedor com reputação ruim no Mercado Livre", tone: "text-rose-700 dark:text-rose-400" },
};

const RADAR_EVENT_LABEL: Record<RadarEventType, { icon: string; label: string }> = {
  PRICE_DROP: { icon: "📉", label: "Preço" },
  BESTSELLER_ENTRY: { icon: "📈", label: "Demanda" },
  TREND_ENTRY: { icon: "📈", label: "Demanda" },
  HIGH_QUALITY_OFFER: { icon: "⭐", label: "Qualidade" },
  AFFILIATE_LINK_ACTIVATED: { icon: "", label: "" }, // never rendered publicly
};

function RadarEventCard({ event }: { event: RadarEvent }) {
  const meta = RADAR_EVENT_LABEL[event.type];
  return (
    <div className="border-border-subtle rounded-xl border p-3">
      <p className="text-foreground/50 text-xs">
        {meta.icon} {meta.label}
      </p>
      <p className="mt-1 text-sm font-medium">{event.headline}</p>
    </div>
  );
}

export function MerchantProductView({
  data,
  related,
  similar,
}: {
  data: PublicMerchantProductViewModel;
  related: RelatedMerchantProduct[];
  similar: SimilarOffers;
}) {
  const priceSummary = summarizePriceHistory(data.priceHistory, data.currentPrice);
  const guide = guideForCategory(similar.categorySlug);
  const categoryLabel = similar.categorySlug !== "outros" ? offerCategoryLabel(similar.categorySlug) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.title,
    image: data.imageUrl ?? undefined,
    brand: data.brand ? { "@type": "Brand", name: data.brand } : undefined,
    aggregateRating:
      data.rating && data.reviewCount
        ? { "@type": "AggregateRating", ratingValue: data.rating, reviewCount: data.reviewCount }
        : undefined,
    // Omitted entirely (never fabricated) when there's no active commercial
    // offer — same rule as the Amazon product page.
    offers:
      data.ctaHref && data.currentPrice !== null
        ? {
            "@type": "Offer",
            priceCurrency: data.currency,
            price: data.currentPrice,
            availability: "https://schema.org/LimitedAvailability",
            url: `${siteConfig.url}${data.ctaHref}`,
          }
        : undefined,
  };

  const breadcrumbItems = [{ label: "Início", href: "/" }, { label: "Ofertas", href: "/ofertas" }, { label: data.title }];
  const breadcrumbList = buildBreadcrumbList(breadcrumbItems);

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="product" pageSlug={data.slug} productId={data.merchantListingId} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptPayload(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScriptPayload(breadcrumbList) }} />

      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 grid min-w-0 gap-8 sm:grid-cols-2">
        <div className="bg-surface-muted aspect-square w-full max-w-full overflow-hidden rounded-xl">
          <ProductImage src={data.imageUrl} alt={data.title} className="h-full w-full object-cover" iconClassName="h-16 w-16" />
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold">{data.title}</h1>
          {data.brand && <p className="text-foreground/60 mt-1 text-sm">{data.brand}</p>}
          <p className="text-foreground/40 mt-1 text-xs">Oferta {MERCHANT_LABEL[data.source]}</p>
          {data.sellerReputationLevel && REPUTATION_LABEL[data.sellerReputationLevel] && (
            <p className={`mt-1 text-xs font-medium ${REPUTATION_LABEL[data.sellerReputationLevel].tone}`}>
              {REPUTATION_LABEL[data.sellerReputationLevel].label}
            </p>
          )}

          {data.currentPrice !== null ? (
            <>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold">{formatCurrency(data.currentPrice, data.currency)}</span>
              </div>
              {data.lastObservedAt && (
                <p className="text-foreground/50 mt-1 text-xs">Observado pelo PreçoCaindo em {formatDate(data.lastObservedAt)}</p>
              )}
              <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {data.decisionSummary}
              </p>
            </>
          ) : (
            <p className="text-foreground/60 mt-4 text-sm leading-relaxed">
              Ainda estamos acompanhando este produto. Assim que tivermos um preço verificado, ele aparece aqui.
            </p>
          )}

          <div className="mt-6">
            <MerchantCta ctaHref={data.ctaHref} />
          </div>
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-lg font-semibold">O que o PreçoCaindo observou</h2>
        {data.radarEvents.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.radarEvents.map((event, i) => (
              <RadarEventCard key={`${event.type}-${i}`} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-foreground/60 mt-3 text-sm leading-relaxed">
            Ainda não observamos eventos suficientes (queda de preço, alta demanda ou avaliação forte) para este
            produto — continuamos acompanhando.
          </p>
        )}
      </section>

      {priceSummary && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold">Histórico de preço observado</h2>
          <p className="text-foreground/70 mt-3 text-sm leading-relaxed">
            Conferimos o preço deste produto {priceSummary.observations} vezes entre {formatDate(priceSummary.first)} e{" "}
            {formatDate(priceSummary.last)}. O menor valor registrado foi {formatCurrency(priceSummary.min, data.currency)} e o
            maior, {formatCurrency(priceSummary.max, data.currency)}. {PRICE_POSITION_TEXT[priceSummary.position]}
          </p>
        </section>
      )}

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold">{guide.heading}</h2>
        <ul className="text-foreground/70 mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {guide.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
        {categoryLabel && (
          <p className="mt-4 text-sm">
            <a href={`/ofertas?categoria=${similar.categorySlug}`} className="text-brand font-semibold underline underline-offset-2">
              Ver todas as ofertas de {categoryLabel} →
            </a>
          </p>
        )}
      </section>

      {similar.items.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Ofertas parecidas{categoryLabel ? ` em ${categoryLabel}` : ""}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.items.map((item) => (
              <a key={item.id} href={item.detailHref} className="group block min-w-0">
                <div className="bg-surface-muted aspect-square w-full overflow-hidden rounded-xl">
                  <ProductImage src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <p className="group-hover:text-brand mt-2 line-clamp-2 text-sm font-medium">{item.title}</p>
                {item.currentPrice !== null && (
                  <p className="text-foreground/70 mt-0.5 text-sm">{formatCurrency(item.currentPrice, "BRL")}</p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {similar.items.length === 0 && related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Outras oportunidades que estamos acompanhando</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((item) => (
              <a key={item.slug} href={`/produto/${item.slug}`} className="group block min-w-0">
                <div className="bg-surface-muted aspect-square w-full overflow-hidden rounded-xl">
                  <ProductImage src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <p className="group-hover:text-brand mt-2 truncate text-sm font-medium">{item.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="border-border-subtle mt-10 max-w-3xl border-t pt-6">
        <h2 className="text-foreground/70 text-sm font-semibold">Metodologia</h2>
        <p className="text-foreground/50 mt-2 text-xs leading-relaxed">
          As observações acima vêm diretamente da coleta automática do PreçoCaindo — nunca de desconto anunciado pelo
          vendedor. Preços e disponibilidade podem mudar a qualquer momento.
        </p>
      </section>
    </div>
  );
}

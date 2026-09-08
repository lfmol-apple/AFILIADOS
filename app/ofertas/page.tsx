import type { Metadata } from "next";
import Link from "next/link";
import { getOfertas } from "@/lib/queries/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { recordSearchEvent } from "@/lib/analytics/search-event";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import type { PagePropsWithSearch } from "@/lib/next-route-types";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  searchUnifiedOffers,
} from "@/lib/queries/unified-offers";
import { UnifiedOfferCard } from "@/components/unified-offer-card";

export const revalidate = 300;

// Cross-merchant vitrine cap for the default (no search) view — a single
// page today (12 Shopee + up to ~a couple hundred Mercado Livre + however
// many Amazon), not a new pagination scheme merging three independently
// paginated sources. Search (a query is present) still uses Amazon's own
// real pagination unchanged — see the comment further down for why.
const UNIFIED_LIMIT = 48;

export function generateMetadata(): Metadata {
  const catalogSafe = currentlyVisibleDataSources().length > 0;
  return {
    title: "Ofertas",
    description:
      "As melhores oportunidades reais do PreçoCaindo agora, em qualquer loja parceira — priorizadas por demanda, preço e evidência real.",
    alternates: { canonical: "/ofertas" },
    // Pre-launch (or every data-source gate closed) — the page stays
    // reachable (it's a listing, not a specific fabricated price), but must
    // never be indexed while nothing real is currently visible.
    robots: catalogSafe ? undefined : { index: false, follow: true },
  };
}

export default async function OfertasPage(props: PagePropsWithSearch) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page ?? 1) || 1;
  const query =
    typeof searchParams?.q === "string" ? searchParams.q : undefined;

  const catalogSafe = currentlyVisibleDataSources().length > 0;

  if (query) {
    // Busca Cross-Merchant V1 (2026-09-08) — pesquisa a base já observada
    // (Product Amazon + MerchantListing Shopee/ML com AffiliateLink
    // ACTIVE), nunca uma API externa durante o request. Ver
    // lib/queries/unified-offers.ts's searchUnifiedOffers() doc comment
    // para o porquê disso não agrupar por produto ainda (ProductMatcher
    // nunca rodou sobre dado real).
    // Bug real corrigido em 2026-09-08: `catalogSafe` só reflete a
    // visibilidade da Amazon (PUBLIC_CATALOG_ENABLED/MANUAL_PRODUCTS_ENABLED)
    // — nunca deve envolver a chamada inteira, senão Shopee/ML (que têm
    // sua própria regra fail-closed via AffiliateLinkRegistry ACTIVE,
    // aplicada dentro de searchUnifiedOffers/getUnifiedMerchantOffers)
    // desaparecem da busca sempre que a Amazon estiver com o catálogo
    // público fechado — exatamente o que já foi corrigido antes na Home e
    // na grade padrão de /ofertas (ver getUnifiedMerchantOffers acima).
    const { items, page: currentPage, totalPages } = await searchUnifiedOffers({ query, page });

    await recordSearchEvent(query, items.length);

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AnalyticsBeacon pageType="ofertas" pageSlug={`busca:${query}`} />
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]} />
        <h1 className="mt-4 text-2xl font-semibold">Resultados para &quot;{query}&quot;</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Resultados reais em qualquer loja parceira, priorizados por
          demanda e evidência.
        </p>
        {items.length === 0 ? (
          <p className="text-foreground/60 mt-10 text-sm">Nenhum produto encontrado.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <nav className="mt-8 flex justify-center gap-2 text-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/ofertas?${new URLSearchParams({ q: query, page: String(p) })}`}
                className={`rounded-full px-3 py-1.5 ${p === currentPage ? "bg-brand text-brand-foreground" : "border-border-subtle hover:border-brand border"}`}
              >
                {p}
              </Link>
            ))}
          </nav>
        )}
      </div>
    );
  }

  // Default (no search) — the real cross-merchant vitrine: Amazon (when
  // it has real products) + Shopee + Mercado Livre, ONE grid, sorted by
  // each merchant's own real, commission-free opportunity signal. Never
  // three separate "Achados X" sections (project brief).
  const [amazonResult, merchantOffers] = await Promise.all([
    catalogSafe ? getOfertas({ page: 1, pageSize: UNIFIED_LIMIT }) : { items: [] },
    getUnifiedMerchantOffers(UNIFIED_LIMIT),
  ]);
  const items = [
    ...amazonResult.items.map(mapAmazonProductToUnifiedCard),
    ...merchantOffers,
  ]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, UNIFIED_LIMIT);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="ofertas" pageSlug="ofertas" />
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]} />
      <h1 className="mt-4 text-2xl font-semibold">Melhores oportunidades agora</h1>
      <p className="text-foreground/60 mt-1 text-sm">
        Busque por produto, marca, modelo ou categoria. Priorizamos por
        demanda, preço e evidência real — em qualquer loja parceira.
      </p>

      {!catalogSafe && items.length === 0 ? (
        <PreLaunchNotice />
      ) : items.length === 0 ? (
        <p className="text-foreground/60 mt-10 text-sm">Nenhuma oferta real disponível agora.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreLaunchNotice() {
  return (
    <div className="border-border-subtle bg-surface-muted mt-10 rounded-lg border p-6 text-sm">
      <p className="font-semibold">Estamos em fase de pré-lançamento.</p>
      <p className="text-foreground/70 mt-1">
        As ofertas ainda não estão disponíveis publicamente. Volte em breve.
      </p>
    </div>
  );
}

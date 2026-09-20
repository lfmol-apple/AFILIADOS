import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { recordSearchEvent } from "@/lib/analytics/search-event";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import type { PagePropsWithSearch } from "@/lib/next-route-types";
import {
  getUnifiedMerchantOffers,
  searchUnifiedOffers,
} from "@/lib/queries/unified-offers";
import { UnifiedOfferCard } from "@/components/unified-offer-card";
import { OffersCategoryNav } from "@/components/offers-category-nav";
import { OffersInfiniteList } from "@/components/offers-infinite-list";
import { OffersToolbar } from "@/components/offers-toolbar";
import { parseOffersView } from "@/lib/offers/view";
import {
  getOfferCategoryCounts,
  getOffersPool,
  listOffers,
} from "@/lib/queries/offers-feed";
import { offerCategoryLabel } from "@/lib/offers/categories";

export const revalidate = 300;

// The default (no search) view is an infinite-scroll feed over one cached,
// ranked cross-merchant pool (lib/queries/offers-feed.ts) — the first page
// is rendered here, later pages come from /api/ofertas. Search (a query is
// present) still uses Amazon's own real pagination unchanged — see the
// comment further down for why.

export async function generateMetadata(): Promise<Metadata> {
  // Same fix as app/robots.ts (2026-09-14): currentlyVisibleDataSources()
  // only knows about Amazon — /ofertas must also stay indexable whenever
  // real Mercado Livre/Shopee offers are showing, regardless of the
  // Amazon gate. Ask what's actually indexable, not just the Amazon flag.
  const catalogSafe =
    currentlyVisibleDataSources().length > 0 ||
    (await getUnifiedMerchantOffers(1)).length > 0;
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
    const {
      items,
      page: currentPage,
      totalPages,
    } = await searchUnifiedOffers({ query, page });

    await recordSearchEvent(query, items.length);

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AnalyticsBeacon pageType="ofertas" pageSlug={`busca:${query}`} />
        <Breadcrumbs
          items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]}
        />
        <h1 className="mt-4 text-2xl font-semibold">
          Resultados para &quot;{query}&quot;
        </h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Resultados reais em qualquer loja parceira, priorizados por demanda e
          evidência.
        </p>
        {items.length === 0 ? (
          <p className="text-foreground/60 mt-10 text-sm">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <UnifiedOfferCard
                key={`${item.merchant}-${item.id}`}
                item={item}
              />
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
  // it has real products) + Shopee + Mercado Livre, ONE feed, sorted by
  // each merchant's own real, commission-free opportunity signal. Never
  // three separate "Achados X" sections (project brief). The category
  // column filters that same feed; it never re-ranks it.
  const view = parseOffersView(searchParams ?? {});
  const category = view.category;

  const [firstPage, categories, pool] = await Promise.all([
    listOffers({ category, sort: view.sort, store: view.store, page: 1 }),
    getOfferCategoryCounts(view.store),
    getOffersPool(),
  ]);
  const visibleTotal = categories.reduce((sum, c) => sum + c.count, 0);

  const title = category
    ? offerCategoryLabel(category)
    : "Melhores oportunidades agora";
  const merchantsPresent = Array.from(new Set(pool.map((c) => c.merchant))).map(
    (m) => MERCHANT_NAMES[m],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AnalyticsBeacon
        pageType="ofertas"
        pageSlug={category ? `ofertas:${category}` : "ofertas"}
      />
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]}
      />

      <header className="relative mt-4 overflow-hidden rounded-2xl bg-linear-to-br from-teal-700 to-teal-950 p-5 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-28 -bottom-24 h-44 w-44 rounded-full bg-white/5"
        />
        <div className="relative max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
            Priorizamos por demanda, preço e evidência real, sem olhar a
            comissão. Atualizado automaticamente.
          </p>
        </div>
        {pool.length > 0 && (
          <ul className="relative mt-5 flex flex-wrap gap-2 text-xs font-semibold sm:text-sm">
            <li className="rounded-full bg-white/15 px-3 py-1.5">
              {firstPage.total} {firstPage.total === 1 ? "oferta" : "ofertas"}
              {category ? " nesta categoria" : ""}
            </li>
            {merchantsPresent.length > 0 && (
              <li className="rounded-full bg-white/15 px-3 py-1.5">
                {merchantsPresent.join(" · ")}
              </li>
            )}
          </ul>
        )}
      </header>

      {!catalogSafe && pool.length === 0 ? (
        <PreLaunchNotice />
      ) : pool.length === 0 ? (
        <p className="text-foreground/60 mt-10 text-sm">
          Nenhuma oferta real disponível agora.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <OffersCategoryNav
            categories={categories}
            view={view}
            total={visibleTotal}
          />
          <div className="min-w-0">
            <OffersToolbar
              view={view}
              total={firstPage.total}
              stores={Array.from(new Set(pool.map((c) => c.merchant)))}
            />
            <OffersInfiniteList
              key={`${category ?? "todas"}|${view.sort}|${view.store ?? "todas"}`}
              initialItems={firstPage.items}
              initialHasMore={firstPage.hasMore}
              category={category}
              sort={view.sort}
              store={view.store}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const MERCHANT_NAMES = {
  AMAZON: "Amazon",
  SHOPEE: "Shopee",
  MERCADO_LIVRE: "Mercado Livre",
} as const;

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

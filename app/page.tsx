import Link from "next/link";
import { getHomeSections } from "@/lib/queries/products";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { AmazonBrShowcase } from "@/components/amazon-br-showcase";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import { GUIDES } from "@/lib/editorial/guides";
import { RadarFeed } from "@/components/radar-feed";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";
import {
  getUnifiedMerchantOffers,
  mapAmazonProductToUnifiedCard,
  type UnifiedOfferCard as UnifiedOfferCardData,
} from "@/lib/queries/unified-offers";
import { UnifiedOfferCard } from "@/components/unified-offer-card";

// Home reorganization, 2026-09-08 — see docs/HOME_ARCHITECTURE.md for the
// full diagnostic/decision record this file implements: one journey
// (descobrir -> entender -> comparar -> decidir -> comprar), not a
// collection of per-marketplace or per-data-source modules. Marketplace
// is a secondary attribute on a card, never a section of its own.

export const dynamic = "force-dynamic";

const LAUNCH_PILLARS = [
  {
    label: "Guias práticos",
    title: "Aprenda antes de comprar",
    body: "Conteúdo editorial útil mesmo quando não existe link comercial disponível.",
  },
  {
    label: "Preço + histórico",
    title: "Decisão clara",
    body: "O site mostra se o preço atual parece bom, comum ou melhor esperar.",
  },
  {
    label: "Links oficiais",
    title: "Compra fora do site",
    body: "O usuário decide aqui e finaliza direto na loja parceira.",
  },
  {
    label: "Alertas",
    title: "Voltar quando cair",
    body: "Quem ainda não quer comprar pode acompanhar a próxima queda.",
  },
];

const FEATURED_GUIDE_SLUGS = [
  "como-saber-se-uma-promocao-e-realmente-boa",
  "como-saber-se-vale-a-pena-comprar-agora",
  "como-funciona-o-historico-de-precos",
  "parcelado-ou-a-vista-como-comparar-corretamente",
  "como-escolher-uma-air-fryer-sem-olhar-apenas-o-preco",
  "como-comparar-celulares-alem-do-preco",
];

type HomeSections = Awaited<ReturnType<typeof getHomeSections>>;

const EMPTY_HOME_SECTIONS: HomeSections = {
  pricesDropping: [],
  bestOpportunities: [],
  popularProducts: [],
  categories: [],
  guides: [],
};

async function loadHomeSections(catalogSafe: boolean): Promise<HomeSections> {
  if (!catalogSafe) return EMPTY_HOME_SECTIONS;
  try {
    return await getHomeSections();
  } catch (error) {
    console.error("home.catalog_unavailable", error);
    return EMPTY_HOME_SECTIONS;
  }
}

export default async function Home() {
  // Amazon-specific gate (AMAZON_PROVIDER=mock, PUBLIC_CATALOG_ENABLED,
  // etc. — see lib/config/public-catalog.ts). Only governs whether
  // Amazon's own Product-backed data is queried at all; Shopee/Mercado
  // Livre data below is entirely independent of it.
  const catalogSafe = currentlyVisibleDataSources().length > 0;
  const { bestOpportunities, categories } = await loadHomeSections(catalogSafe);

  const [radarItems, merchantOffers] = await Promise.all([
    // Resilient the same way loadHomeSections is — a query failure never
    // breaks the homepage.
    getPublicRadarFeed(8).catch((error) => {
      console.error("home.radar_unavailable", error);
      return [];
    }),
    getUnifiedMerchantOffers(24).catch((error) => {
      console.error("home.merchant_offers_unavailable", error);
      return [] as UnifiedOfferCardData[];
    }),
  ]);

  // "Melhores oportunidades agora" — cross-merchant, real, purchasable
  // items only (every source here already filters to a real, ACTIVE
  // affiliate link or, for Amazon, a real Offer row). Sorted by each
  // merchant's own real, commission-free opportunity signal — see
  // lib/queries/unified-offers.ts's doc comment for exactly what that is
  // and why commission never enters it.
  const bestOffers = [...bestOpportunities.map(mapAmazonProductToUnifiedCard), ...merchantOffers]
    .sort((a, b) => (b.opportunitySignal ?? -1) - (a.opportunitySignal ?? -1))
    .slice(0, 8);

  // "REAL > PLACEHOLDER" (project brief) — the old Amazon-only
  // catalogUnavailable gate is gone: with 0 Amazon products but 12
  // Shopee + up to 200 Mercado Livre listings, showing a "catálogo ainda
  // não disponível" notice would be false. Only show it when there is
  // genuinely nothing commercial to show anywhere on the page.
  const hasAnyRealCommercialContent = radarItems.length > 0 || bestOffers.length > 0;

  const featuredGuides = FEATURED_GUIDE_SLUGS.map((slug) =>
    GUIDES.find((guide) => guide.slug === slug),
  ).filter((guide): guide is (typeof GUIDES)[number] => Boolean(guide));

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />

      {/* ---------------- 1. HERO + BUSCA ---------------- */}
      <section className="border-border-subtle bg-surface-muted border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-16">
          <div>
            <div className="border-border-subtle bg-background text-brand inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
              Inteligência de compra independente
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Descubra se está barato de verdade.
            </h1>
            <p className="text-foreground/70 mt-4 max-w-2xl text-base leading-relaxed">
              O PreçoCaindo ajuda você a entender se vale comprar agora ou
              esperar, combinando histórico, custo real, critérios editoriais e
              ferramentas simples de comparação.
            </p>
            <form action="/ofertas" method="GET" className="mt-8 max-w-xl">
              <label htmlFor="hero-search" className="sr-only">
                O que você está pensando em comprar?
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="hero-search"
                  type="search"
                  name="q"
                  placeholder="Busque produto, marca, modelo ou categoria"
                  className="border-border-subtle bg-background focus:border-brand min-h-12 w-full rounded-full border px-5 py-3 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="bg-brand text-brand-foreground min-h-12 rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90"
                >
                  Buscar
                </button>
              </div>
            </form>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
              {[
                "Promoção real",
                "Custo por unidade",
                "À vista vs. parcelado",
                "Histórico explicado",
              ].map((item) => (
                <span
                  key={item}
                  className="border-border-subtle bg-background text-foreground/70 rounded-full border px-3 py-1.5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            id="valor-editorial"
            className="border-border-subtle bg-background rounded-lg border p-5"
          >
            <p className="text-brand text-sm font-semibold">
              Útil mesmo sem link afiliado
            </p>
            <div className="mt-4 space-y-3">
              {LAUNCH_PILLARS.map((pillar, index) => (
                <div
                  key={pillar.label}
                  className="border-border-subtle flex gap-3 border-t pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="bg-surface-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-foreground/50 text-xs font-semibold tracking-wide uppercase">
                      {pillar.label}
                    </p>
                    <h2 className="text-sm font-semibold">{pillar.title}</h2>
                    <p className="text-foreground/60 mt-1 text-sm leading-relaxed">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/guias"
              className="bg-brand text-brand-foreground mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold"
            >
              Ver guias de compra
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- 2. RADAR ---------------- */}
      <RadarFeed items={radarItems} />

      {!hasAnyRealCommercialContent && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="border-border-subtle rounded-lg border p-6 text-sm">
            <p className="font-semibold">Comece pela decisão, não pelo link.</p>
            <p className="text-foreground/70 mt-1">
              Enquanto o catálogo comercial não é publicado, o PreçoCaindo
              concentra o que já dá para avaliar com segurança: método de
              comparação, custo real, histórico, parcelamento e sinais de falsa
              promoção.
            </p>
          </div>
        </section>
      )}

      {/* ---------------- 3. MELHORES OPORTUNIDADES AGORA ---------------- */}
      {bestOffers.length > 0 && (
        <HomeSection title="🏆 Melhores oportunidades agora" href="/ofertas">
          {bestOffers.map((item) => (
            <UnifiedOfferCard key={`${item.merchant}-${item.id}`} item={item} />
          ))}
        </HomeSection>
      )}

      <AmazonBrShowcase />

      {/* ---------------- 4. CATEGORIAS ---------------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-lg font-semibold">Categorias</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categorias/${category.slug}`}
                className="border-border-subtle hover:border-brand hover:text-brand rounded-full border px-4 py-2 text-sm"
              >
                {category.name}
                <span className="text-foreground/40 ml-1">
                  ({category._count.products})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- 5. GUIAS ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Guias para comprar melhor</h2>
        <p className="text-foreground/70 mt-1 text-sm leading-relaxed">
          Conteúdo independente para decidir com segurança: histórico, custo
          real, comparação entre lojas e sinais de falsa promoção.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGuides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guias/${guide.slug}`}
                className="border-border-subtle hover:border-brand block rounded-lg border p-4 text-sm"
              >
                <span className="text-foreground/50 block text-xs tracking-wide uppercase">
                  {guide.category}
                </span>
                <span className="mt-1 block font-medium">{guide.title}</span>
                <span className="text-foreground/50 mt-3 block text-xs">
                  {guide.readingTime} de leitura
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/guias"
          className="text-brand mt-4 inline-block text-sm hover:underline"
        >
          Ver todos os guias
        </Link>
      </section>

      {/* ---------------- 6. COMO FUNCIONA / METODOLOGIA ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Como o PreçoCaindo decide</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Evidência antes do destaque",
              body: "Ranqueamos por demanda, histórico e sinais reais de mercado — nunca por comissão. Cada destaque precisa de preço, imagem, loja de destino e evidência antes de aparecer.",
            },
            {
              title: "Independência comercial",
              body: "Comissão não compra posição, score nem conclusão. Se faltar evidência, a página diz isso — nunca inventa.",
            },
            {
              title: "Utilidade sem afiliado",
              body: "O usuário vê o veredito e decide: compra na loja parceira agora ou espera. Guias ajudam mesmo sem link comercial disponível.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-border-subtle rounded-lg border p-4"
            >
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/metodologia"
          className="text-brand mt-4 inline-block text-sm hover:underline"
        >
          Ver metodologia completa
        </Link>
      </section>
    </div>
  );
}

function HomeSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className="text-brand text-sm hover:underline">
          Ver todas
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

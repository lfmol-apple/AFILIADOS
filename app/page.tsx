import Link from "next/link";
import { getHomeSections } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import { GUIDES } from "@/lib/editorial/guides";

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

const FEATURED_TOOL_SLUGS = [
  "como-comparar-preco-por-kg-litro-ou-unidade",
  "parcelado-ou-a-vista-como-comparar-corretamente",
  "como-comparar-precos-sem-cair-em-falso-desconto",
];

const EDITORIAL_CATEGORIES = [
  "Decisão de compra",
  "Histórico de preços",
  "Comparação",
  "Planejamento",
];

type HomeSections = Awaited<ReturnType<typeof getHomeSections>>;

const EMPTY_HOME_SECTIONS: HomeSections = {
  pricesDropping: [],
  bestOpportunities: [],
  popularProducts: [],
  categories: [],
  guides: [],
};

async function loadHomeSections(catalogSafe: boolean): Promise<{
  sections: HomeSections;
  catalogUnavailable: boolean;
}> {
  if (!catalogSafe) {
    return { sections: EMPTY_HOME_SECTIONS, catalogUnavailable: true };
  }

  try {
    return {
      sections: await getHomeSections(),
      catalogUnavailable: false,
    };
  } catch (error) {
    console.error("home.catalog_unavailable", error);
    return { sections: EMPTY_HOME_SECTIONS, catalogUnavailable: true };
  }
}

export default async function Home() {
  // Pre-launch (or every data-source gate closed) — see
  // lib/config/public-catalog.ts. Deliberately checks "is anything at all
  // currently visible" rather than isPublicCatalogSafeToShow() alone: a
  // MANUAL_VERIFIED cohort can be visible even when that check is false
  // (e.g. AMAZON_PROVIDER=mock in production). The homepage itself stays up
  // in an institutional shell either way; only the catalog-derived sections
  // are withheld when nothing is currently visible.
  const catalogSafe = currentlyVisibleDataSources().length > 0;
  const { sections, catalogUnavailable } = await loadHomeSections(catalogSafe);
  const {
    pricesDropping,
    bestOpportunities,
    popularProducts,
    categories,
    guides,
  } = sections;
  const featuredGuides = FEATURED_GUIDE_SLUGS.map((slug) =>
    GUIDES.find((guide) => guide.slug === slug),
  ).filter((guide): guide is (typeof GUIDES)[number] => Boolean(guide));
  const featuredTools = FEATURED_TOOL_SLUGS.map((slug) =>
    GUIDES.find((guide) => guide.slug === slug),
  ).filter((guide): guide is (typeof GUIDES)[number] => Boolean(guide));

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />
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

      {catalogUnavailable && (
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

      {pricesDropping.length > 0 && (
        <HomeSection title="🔥 Preços caindo agora" href="/ofertas">
          {pricesDropping.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </HomeSection>
      )}

      {bestOpportunities.length > 0 && (
        <HomeSection title="🏆 Boas compras agora" href="/ofertas">
          {bestOpportunities.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </HomeSection>
      )}

      {popularProducts.length > 0 &&
        pricesDropping.length === 0 &&
        bestOpportunities.length === 0 && (
          <HomeSection title="Produtos populares monitorados" href="/ofertas">
            {popularProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </HomeSection>
        )}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Motor de decisão de compra</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "1. Ranking",
              body: "Começamos pelos produtos com maior demanda e categorias com mais intenção de compra.",
            },
            {
              title: "2. Verificação",
              body: "Cada produto precisa ter preço, imagem, loja de destino e evidências antes de ganhar destaque.",
            },
            {
              title: "3. Decisão",
              body: "O usuário vê o veredito, compra na loja parceira ou cria alerta para acompanhar queda.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="border-border-subtle rounded-lg border p-4"
            >
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 className="text-lg font-semibold">Categorias editoriais</h2>
            <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
              O conteúdo é organizado por tipo de decisão, para o usuário
              encontrar rapidamente como comparar antes de comprar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {EDITORIAL_CATEGORIES.map((category) => (
              <div
                key={category}
                className="border-border-subtle rounded-lg border p-4"
              >
                <p className="text-sm font-semibold">{category}</p>
                <p className="text-foreground/60 mt-1 text-sm">
                  Guias independentes para avaliar preço, momento e custo real.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Ferramentas rápidas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {featuredTools.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guias/${guide.slug}`}
              className="border-border-subtle hover:border-brand block rounded-lg border p-4"
            >
              <p className="text-sm font-semibold">{guide.title}</p>
              <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
                Inclui calculadora para transformar a comparação em decisão
                objetiva.
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Metodologia</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Evidência antes do destaque",
              body: "Uma recomendação precisa explicar o sinal usado: histórico, custo por unidade, preço final ou critério editorial.",
            },
            {
              title: "Independência comercial",
              body: "Comissão não compra posição editorial, score nem conclusão. Se faltar evidência, a página deve dizer isso.",
            },
            {
              title: "Utilidade sem afiliado",
              body: "Cada guia precisa ajudar mesmo quando não há botão de compra disponível.",
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

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-lg font-semibold">Mais procurados</h2>
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

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold">Guias para comprar melhor</h2>
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
          {guides.map((guide) => (
            <li key={guide.id}>
              <Link
                href={`/${guide.contentType === "BEST_OF" ? "melhores" : "comparar"}/${guide.slug}`}
                className="border-border-subtle hover:border-brand block rounded-lg border p-4 text-sm"
              >
                {guide.title}
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

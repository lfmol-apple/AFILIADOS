import Link from "next/link";
import { getHomeSections } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

export const revalidate = 300;

export default async function Home() {
  // Pre-launch (or a misconfigured production+mock combo) — see
  // lib/config/public-catalog.ts. The homepage itself stays up in an
  // institutional shell; only the catalog-derived sections are withheld,
  // since those are the only thing that could show fictional prices.
  const catalogSafe = isPublicCatalogSafeToShow();
  const { pricesDropping, bestOpportunities, categories, guides } = catalogSafe
    ? await getHomeSections()
    : { pricesDropping: [], bestOpportunities: [], categories: [], guides: [] };

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />
      <section className="border-border-subtle bg-surface-muted border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Descubra se está barato de verdade.
          </h1>
          <p className="text-foreground/70 mt-4 max-w-xl">
            Acompanhamos preços e o histórico de cada produto para mostrar se
            vale comprar agora ou esperar — com metodologia própria e
            independente, não uma recomendação da Amazon.
          </p>
          <form action="/ofertas" method="GET" className="mt-8 max-w-xl">
            <label htmlFor="hero-search" className="sr-only">
              O que você está pensando em comprar?
            </label>
            <div className="flex gap-2">
              <input
                id="hero-search"
                type="search"
                name="q"
                placeholder="O que você está pensando em comprar?"
                className="border-border-subtle bg-background focus:border-brand w-full rounded-full border px-5 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                className="bg-brand text-brand-foreground rounded-full px-5 py-3 text-sm font-semibold hover:opacity-90"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {!catalogSafe && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="border-border-subtle bg-surface-muted rounded-lg border p-6 text-sm">
            <p className="font-semibold">Estamos em fase de pré-lançamento.</p>
            <p className="text-foreground/70 mt-1">
              O catálogo de produtos ainda não está disponível publicamente.
              Volte em breve para comparar preços reais da Amazon.
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
        {guides.length === 0 ? (
          <p className="text-foreground/60 mt-3 text-sm">
            Ainda estamos preparando os primeiros guias de compra. Volte em
            breve.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
        )}
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

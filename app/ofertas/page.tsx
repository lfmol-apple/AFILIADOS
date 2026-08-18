import type { Metadata } from "next";
import Link from "next/link";
import { getOfertas } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { recordSearchEvent } from "@/lib/analytics/search-event";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Produtos com o melhor Score PreçoCaindo agora — preços comparados ao histórico, não só ao preço de tabela.",
  alternates: { canonical: "/ofertas" },
};

export default async function OfertasPage(props: PageProps<"/ofertas">) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page ?? 1) || 1;
  const query =
    typeof searchParams?.q === "string" ? searchParams.q : undefined;

  const {
    items,
    page: currentPage,
    totalPages,
    total,
  } = await getOfertas({ page, query });

  if (query) {
    await recordSearchEvent(query, total);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon
        pageType="ofertas"
        pageSlug={query ? `busca:${query}` : "ofertas"}
      />
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]}
      />

      <h1 className="mt-4 text-2xl font-semibold">
        {query ? `Resultados para "${query}"` : "Boas compras agora"}
      </h1>
      <p className="text-foreground/60 mt-1 text-sm">
        Ordenado pelo Score PreçoCaindo — preço atual comparado ao histórico
        coletado por nós, não só ao preço de tabela.
      </p>

      {items.length === 0 ? (
        <p className="text-foreground/60 mt-10 text-sm">
          Nenhum produto encontrado.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/ofertas?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`}
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

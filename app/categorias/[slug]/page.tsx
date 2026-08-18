import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  type CategorySort,
} from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

export const revalidate = 600;

const SORT_OPTIONS: { value: CategorySort; label: string }[] = [
  { value: "score", label: "Melhor Score" },
  { value: "drop", label: "Maior queda" },
  { value: "price", label: "Menor preço" },
];

function parseSort(value: string | undefined): CategorySort {
  return value === "drop" || value === "price" ? value : "score";
}

async function loadCategory(slug: string, sort: CategorySort) {
  // Pre-launch (or a misconfigured production+mock combo) — a category page
  // with only fabricated prices in it has nothing safe to show. See
  // lib/config/public-catalog.ts.
  if (!isPublicCatalogSafeToShow()) return null;
  return getCategoryBySlug(slug, sort);
}

export async function generateMetadata(
  props: PageProps<"/categorias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadCategory(slug, "score");
  if (!data) return {};
  return {
    title: data.category.name,
    description: `Melhores preços em ${data.category.name}, comparados ao histórico coletado pelo PreçoCaindo.`,
    alternates: { canonical: `/categorias/${data.category.slug}` },
  };
}

export default async function CategoryPage(
  props: PageProps<"/categorias/[slug]">,
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const sort = parseSort(
    typeof searchParams?.sort === "string" ? searchParams.sort : undefined,
  );

  const data = await loadCategory(slug, sort);
  if (!data) notFound();

  const { category, products } = data;
  const goodOpportunities = products.filter(
    (p) => (p.opportunityScore?.score ?? 0) >= 75,
  ).length;

  const breadcrumbItems = [
    { label: "Início", href: "/" },
    { label: category.name },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="category" pageSlug={category.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbList(breadcrumbItems)),
        }}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <h1 className="mt-4 text-2xl font-semibold">{category.name}</h1>
      <p className="text-foreground/60 mt-1 text-sm">
        {products.length === 0
          ? "Produtos acompanhados nesta categoria."
          : `${products.length} produto${products.length === 1 ? "" : "s"} acompanhado${products.length === 1 ? "" : "s"}${goodOpportunities > 0 ? ` · ${goodOpportunities} boa${goodOpportunities === 1 ? "" : "s"} oportunidade${goodOpportunities === 1 ? "" : "s"}` : ""}`}
      </p>

      {products.length === 0 ? (
        <p className="text-foreground/60 mt-10 text-sm">
          Ainda não temos produtos suficientes nesta categoria.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={
                  opt.value === "score"
                    ? `/categorias/${category.slug}`
                    : `/categorias/${category.slug}?sort=${opt.value}`
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  sort === opt.value
                    ? "bg-brand text-brand-foreground border-brand"
                    : "border-border-subtle hover:border-brand"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

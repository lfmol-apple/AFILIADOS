import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { buildBreadcrumbList } from "@/lib/seo/structured-data";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

export const revalidate = 600;

async function loadCategory(slug: string) {
  // Pre-launch (or a misconfigured production+mock combo) — a category page
  // with only fabricated prices in it has nothing safe to show. See
  // lib/config/public-catalog.ts.
  if (!isPublicCatalogSafeToShow()) return null;
  return getCategoryBySlug(slug);
}

export async function generateMetadata(
  props: PageProps<"/categorias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadCategory(slug);
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
  const data = await loadCategory(slug);
  if (!data) notFound();

  const { category, products } = data;
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

      {products.length === 0 ? (
        <p className="text-foreground/60 mt-10 text-sm">
          Ainda não temos produtos suficientes nesta categoria.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/queries/products";
import { ProductCard } from "@/components/product-card";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const revalidate = 600;

export async function generateMetadata(
  props: PageProps<"/categorias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getCategoryBySlug(slug);
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
  const data = await getCategoryBySlug(slug);
  if (!data) notFound();

  const { category, products } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[{ label: "Início", href: "/" }, { label: category.name }]}
      />
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

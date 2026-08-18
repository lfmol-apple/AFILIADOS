import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/queries/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { renderSimpleMarkdown } from "@/lib/markdown";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

export const revalidate = 3600;

async function loadComparison(slug: string) {
  // Pre-launch (or a misconfigured production+mock combo) — comparison
  // content is built around real catalog prices. See lib/config/public-catalog.ts.
  if (!isPublicCatalogSafeToShow()) return null;
  return getPublishedContent("COMPARISON", slug);
}

export async function generateMetadata(
  props: PageProps<"/comparar/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const content = await loadComparison(slug);
  if (!content) return {};
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: `/comparar/${slug}` },
  };
}

export default async function ComparisonPage(
  props: PageProps<"/comparar/[slug]">,
) {
  const { slug } = await props.params;
  const content = await loadComparison(slug);
  if (!content) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Comparações", href: "/ofertas" },
          { label: content.title },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">{content.title}</h1>
      <div>{renderSimpleMarkdown(content.body)}</div>
    </div>
  );
}

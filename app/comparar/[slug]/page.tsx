import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/queries/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { renderSimpleMarkdown } from "@/lib/markdown";

export const revalidate = 3600;

export async function generateMetadata(
  props: PageProps<"/comparar/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const content = await getPublishedContent("COMPARISON", slug);
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
  const content = await getPublishedContent("COMPARISON", slug);
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

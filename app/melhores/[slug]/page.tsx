import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedContent } from "@/lib/queries/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { renderSimpleMarkdown } from "@/lib/markdown";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

export const revalidate = 3600;

async function loadBestOf(slug: string) {
  // Pre-launch (or a misconfigured production+mock combo) — "best of"
  // content is built around real catalog prices. See lib/config/public-catalog.ts.
  if (!isPublicCatalogSafeToShow()) return null;
  return getPublishedContent("BEST_OF", slug);
}

export async function generateMetadata(
  props: PageProps<"/melhores/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const content = await loadBestOf(slug);
  if (!content) return {};
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: `/melhores/${slug}` },
  };
}

/**
 * Editorial "best of" pages are entirely driven by PUBLISHED GeneratedContent
 * — this route never renders anything the ContentQualityGate hasn't
 * approved and PUBLISH_CONTENT hasn't published (project brief section 13).
 */
export default async function BestOfPage(props: PageProps<"/melhores/[slug]">) {
  const { slug } = await props.params;
  const content = await loadBestOf(slug);
  if (!content) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Melhores", href: "/ofertas" },
          { label: content.title },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">{content.title}</h1>
      <div>{renderSimpleMarkdown(content.body)}</div>
    </div>
  );
}

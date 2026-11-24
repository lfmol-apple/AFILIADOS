import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGuideBySlug,
  getRelatedGuides,
  GUIDES,
} from "@/lib/editorial/guides";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  InstallmentComparisonTool,
  RealDiscountTool,
  TargetPriceTool,
  UnitComparisonTool,
} from "@/components/editorial-tools";
import {
  buildBreadcrumbList,
  jsonLdScriptPayload,
} from "@/lib/seo/structured-data";
import { siteConfig } from "@/lib/config/site";
import { AnalyticsBeacon } from "@/components/analytics-beacon";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};

  return {
    title: guide.seo.title,
    description: guide.seo.description,
    alternates: { canonical: `/guias/${guide.slug}` },
    openGraph: {
      title: guide.seo.title,
      description: guide.seo.description,
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: [guide.author],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.seo.title,
      description: guide.seo.description,
    },
  };
}

export default async function GuiaPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const breadcrumbItems = [
    { label: "Início", href: "/" },
    { label: "Guias", href: "/guias" },
    { label: guide.title },
  ];
  const related = getRelatedGuides(guide);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Organization", name: guide.author },
    publisher: { "@type": "Organization", name: "PreçoCaindo" },
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: `${siteConfig.url}/guias/${guide.slug}`,
  };
  const breadcrumbJsonLd = buildBreadcrumbList(breadcrumbItems);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <AnalyticsBeacon pageType="guide" pageSlug={guide.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptPayload(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScriptPayload(breadcrumbJsonLd),
        }}
      />

      <Breadcrumbs items={breadcrumbItems} />

      <p className="text-brand mt-6 text-xs font-semibold tracking-wide uppercase">
        {guide.category}
      </p>
      <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight">
        {guide.title}
      </h1>
      <p className="text-foreground/70 mt-4 text-base leading-relaxed">
        {guide.description}
      </p>
      <div className="text-foreground/50 mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span>Por {guide.author}</span>
        <span>Publicado em {formatGuideDate(guide.publishedAt)}</span>
        <span>Atualizado em {formatGuideDate(guide.updatedAt)}</span>
        <span>{guide.readingTime} de leitura</span>
      </div>

      <div
        aria-label={guide.hero.alt}
        className="bg-surface-muted text-brand border-border-subtle mt-8 flex aspect-[16/9] items-center justify-center rounded-xl border px-6 text-center text-lg font-semibold"
      >
        {guide.hero.label}
      </div>

      <div className="mt-8 space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="text-foreground/80 mt-3 text-sm leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="text-foreground/80 mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {guide.tool && (
        <div className="mt-10">
          <GuideToolRenderer tool={guide.tool} />
        </div>
      )}

      <section className="border-border-subtle mt-10 rounded-xl border p-5">
        <h2 className="text-base font-semibold">Nota editorial</h2>
        <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
          Este guia é informativo e independente de qualquer loja específica.
          Quando houver links comerciais no PreçoCaindo, eles não devem alterar
          artificialmente o histórico, o score ou a decisão apresentada ao
          usuário.
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Conteúdos relacionados</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/guias/${item.slug}`}
                className="border-border-subtle hover:border-brand rounded-lg border p-4 text-sm font-medium"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link
        href="/guias"
        className="text-brand mt-10 inline-block text-sm hover:underline"
      >
        Voltar para Guias
      </Link>
    </article>
  );
}

function GuideToolRenderer({
  tool,
}: {
  tool: Exclude<(typeof GUIDES)[number]["tool"], null>;
}) {
  if (tool === "unit-comparison") return <UnitComparisonTool />;
  if (tool === "installment-comparison") return <InstallmentComparisonTool />;
  if (tool === "real-discount") return <RealDiscountTool />;
  return <TargetPriceTool />;
}

function formatGuideDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

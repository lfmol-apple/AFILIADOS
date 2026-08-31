import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES, getGuideCategories } from "@/lib/editorial/guides";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { jsonLdScriptPayload } from "@/lib/seo/structured-data";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Guias para comprar melhor",
  description:
    "Guias práticos do PreçoCaindo para decidir se vale comprar agora, comparar histórico e evitar falsas promoções.",
  alternates: { canonical: "/guias" },
  openGraph: {
    title: "Guias PreçoCaindo",
    description:
      "Conteúdo original para comprar melhor: histórico, preço-alvo, comparação entre lojas e decisão de compra.",
  },
};

export default function GuiasPage() {
  const featured = GUIDES.slice(0, 3);
  const categories = getGuideCategories();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guias PreçoCaindo",
    description: metadata.description,
    url: `${siteConfig.url}/guias`,
    hasPart: GUIDES.map((guide) => ({
      "@type": "Article",
      headline: guide.title,
      url: `${siteConfig.url}/guias/${guide.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AnalyticsBeacon pageType="guides" pageSlug="guias" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptPayload(jsonLd) }}
      />

      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Guias para comprar melhor
        </h1>
        <p className="text-foreground/70 mt-3 max-w-2xl text-sm leading-relaxed">
          Conteúdo prático para decidir melhor: entender histórico, comparar
          lojas, calcular custo real, avaliar parcelamento e evitar compras por
          impulso.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Em destaque</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {featured.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} featured />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="border-border-subtle rounded-full border px-3 py-1.5 text-sm"
            >
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Ferramentas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GUIDES.filter((guide) => guide.tool).map((guide) => (
            <Link
              key={guide.slug}
              href={`/guias/${guide.slug}`}
              className="border-border-subtle hover:border-brand rounded-lg border p-4"
            >
              <p className="text-sm font-semibold">{guide.title}</p>
              <p className="text-foreground/60 mt-1 text-sm">
                Inclui ferramenta interativa.
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Todos os guias</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GuideCard({
  guide,
  featured = false,
}: {
  guide: (typeof GUIDES)[number];
  featured?: boolean;
}) {
  return (
    <Link
      href={`/guias/${guide.slug}`}
      className="border-border-subtle hover:border-brand bg-background flex h-full flex-col overflow-hidden rounded-lg border"
    >
      <div className="bg-surface-muted text-brand flex aspect-[16/9] items-center justify-center px-4 text-center text-sm font-semibold">
        {guide.hero.label}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-foreground/50 text-xs tracking-wide uppercase">
          {guide.category}
        </p>
        <h3
          className={`${featured ? "text-base" : "text-sm"} mt-2 font-semibold`}
        >
          {guide.title}
        </h3>
        <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
          {guide.description}
        </p>
        <p className="text-foreground/50 mt-auto pt-4 text-xs">
          {guide.readingTime} · atualizado em{" "}
          {new Date(guide.updatedAt).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </Link>
  );
}

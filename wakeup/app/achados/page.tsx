import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { AmazonShowcaseDetailCard } from "@/components/amazon-br-showcase";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import {
  AMAZON_SHOWCASE_ALL,
  type AmazonShowcaseCategory,
} from "@/lib/amazon/br-showcase";
import {
  AMAZON_CATEGORY_GUIDES,
  AMAZON_CONTENT_REVIEWED_ON,
  AMAZON_FAQ,
} from "@/lib/amazon/br-showcase-content";

// The affiliate tag lives in the runtime .env, which the Docker build never
// sees — a statically prerendered page would bake in "link indisponível".
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achados na Amazon: seleção comentada e guias de compra",
  description:
    "Produtos da Amazon.com.br escolhidos à mão pelo PreçoCaindo, com análise própria: para quem cada um faz sentido, quando não vale, o que conferir antes de comprar e guias por categoria.",
  alternates: { canonical: "/achados" },
  openGraph: {
    title: "Achados na Amazon — PreçoCaindo",
    description:
      "Seleção editorial com análise própria, guias de compra por categoria e checklist antes de comprar. Sem preços inventados.",
  },
};

const CRITERIA = [
  {
    title: "Escolhidos à mão",
    body: "Cada produto entra por decisão editorial, não por ranking automático. Título e marca são conferidos na própria página do produto na Amazon.",
  },
  {
    title: "Comentário próprio",
    body: "Em vez de repetir a ficha técnica, explicamos para quem o produto faz sentido, quando não é a melhor escolha e o que conferir antes de comprar.",
  },
  {
    title: "Sem preço inventado",
    body: "Não exibimos preço, desconto ou disponibilidade aqui, porque esses dados mudam o tempo todo. O valor atual é o que aparece na Amazon no momento da compra.",
  },
  {
    title: "A compra é na Amazon",
    body: "O PreçoCaindo não vende nem entrega nada e não tem vínculo de patrocínio da Amazon. O botão leva direto à página do produto.",
  },
];

const CATEGORY_ORDER: AmazonShowcaseCategory[] = [
  "Tecnologia",
  "Casa & Eletrodomésticos",
  "Esporte & Fitness",
  "Pet",
];

function categoryId(category: string): string {
  return `cat-${category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export default function AchadosPage() {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    guide: AMAZON_CATEGORY_GUIDES[category],
    products: AMAZON_SHOWCASE_ALL.filter((p) => p.category === category),
  })).filter((g) => g.products.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AnalyticsBeacon pageType="achados" pageSlug="achados" />

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Achados na Amazon
      </h1>
      <p className="text-foreground/70 mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
        Uma seleção de produtos da Amazon.com.br para quem está pesquisando
        antes de comprar. Para cada um, explicamos para quem faz sentido, quando
        não é a melhor escolha e o que conferir antes de fechar a compra — e, em
        cada categoria, um guia rápido de como escolher.
      </p>

      <nav aria-label="Categorias de achados" className="mt-6">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {groups.map((g) => (
            <li key={g.category} className="shrink-0">
              <a
                href={`#${categoryId(g.category)}`}
                className="border-border-subtle hover:border-brand flex min-h-11 items-center rounded-full border px-4 text-sm font-medium"
              >
                {g.category}
                <span className="text-foreground/40 ml-2 text-xs">
                  {g.products.length}
                </span>
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a
              href="#perguntas"
              className="border-border-subtle hover:border-brand flex min-h-11 items-center rounded-full border px-4 text-sm font-medium"
            >
              Perguntas frequentes
            </a>
          </li>
        </ul>
      </nav>

      <section className="mt-10" aria-labelledby="criterios">
        <h2 id="criterios" className="text-lg font-semibold">
          Como escolhemos
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <div
              key={c.title}
              className="border-border-subtle rounded-lg border p-4"
            >
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <p className="text-foreground/70 mt-1.5 text-sm leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {groups.map((g) => (
        <section
          key={g.category}
          id={categoryId(g.category)}
          className="mt-14 scroll-mt-24"
          aria-labelledby={`${categoryId(g.category)}-titulo`}
        >
          <h2
            id={`${categoryId(g.category)}-titulo`}
            className="text-xl font-semibold"
          >
            {g.category}
          </h2>

          <div className="bg-surface-muted mt-4 rounded-xl p-5 sm:p-6">
            <h3 className="text-sm font-semibold">
              Como escolher em {g.category}
            </h3>
            <p className="text-foreground/75 mt-2 max-w-3xl text-sm leading-relaxed">
              {g.guide.intro}
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {g.guide.criterios.map((c) => (
                <div key={c.titulo}>
                  <dt className="text-sm font-semibold">{c.titulo}</dt>
                  <dd className="text-foreground/70 mt-1 text-sm leading-relaxed">
                    {c.texto}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {g.products.map((product) => (
              <AmazonShowcaseDetailCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      <section
        id="perguntas"
        className="mt-14 scroll-mt-24"
        aria-labelledby="perguntas-titulo"
      >
        <h2 id="perguntas-titulo" className="text-xl font-semibold">
          Perguntas frequentes
        </h2>
        <div className="border-border-subtle mt-4 divide-y rounded-xl border">
          {AMAZON_FAQ.map((item) => (
            <details key={item.pergunta} className="group px-5 py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {item.pergunta}
                <span
                  aria-hidden
                  className="text-foreground/40 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-foreground/75 mt-2 max-w-3xl text-sm leading-relaxed">
                {item.resposta}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 max-w-2xl">
        <AffiliateDisclosure />
        <p className="text-foreground/60 mt-3 text-xs leading-relaxed">
          Última revisão editorial: {AMAZON_CONTENT_REVIEWED_ON}. Saiba como
          trabalhamos na{" "}
          <Link href="/politica-editorial" className="underline">
            política editorial
          </Link>{" "}
          e na página de{" "}
          <Link href="/transparencia" className="underline">
            transparência
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { AmazonShowcaseCard } from "@/components/amazon-br-showcase";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { AMAZON_SHOWCASE_ALL, type AmazonShowcaseCategory } from "@/lib/amazon/br-showcase";

// The affiliate tag lives in the runtime .env, which the Docker build never
// sees — a statically prerendered page would bake in "link indisponível".
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Achados na Amazon",
  description:
    "Produtos da Amazon.com.br selecionados à mão pelo PreçoCaindo, com comentário próprio sobre para quem cada um faz sentido e o que avaliar antes de comprar.",
  alternates: { canonical: "/amazon" },
  openGraph: {
    title: "Achados na Amazon — PreçoCaindo",
    description:
      "Seleção editorial de produtos da Amazon.com.br, com análise própria e sem preços inventados.",
  },
};

const CRITERIA = [
  {
    title: "Escolhidos à mão",
    body: "Cada produto entra por decisão editorial, não por ranking automático. Título e marca são conferidos na própria página do produto na Amazon.",
  },
  {
    title: "Comentário próprio",
    body: "Em vez de repetir a ficha técnica, explicamos o que o produto é, para quem faz sentido e qual critério pesar antes de comprar.",
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

export default function AmazonPage() {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    products: AMAZON_SHOWCASE_ALL.filter((p) => p.category === category),
  })).filter((g) => g.products.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AnalyticsBeacon pageType="amazon" pageSlug="amazon" />

      <h1 className="text-3xl font-semibold tracking-tight">Achados na Amazon</h1>
      <p className="text-foreground/70 mt-3 max-w-2xl text-sm leading-relaxed">
        Uma seleção de produtos da Amazon.com.br que valem a atenção de quem está pesquisando antes
        de comprar, cada um com nossa análise.
      </p>

      <div className="mt-5 max-w-2xl">
        <AffiliateDisclosure prominent />
      </div>

      <section className="mt-10" aria-labelledby="criterios">
        <h2 id="criterios" className="text-lg font-semibold">
          Como escolhemos
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <div key={c.title} className="border-border-subtle rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <p className="text-foreground/70 mt-1.5 text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.category} className="mt-12" aria-labelledby={`cat-${g.category}`}>
          <h2 id={`cat-${g.category}`} className="text-lg font-semibold">
            {g.category}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.products.map((product) => (
              <AmazonShowcaseCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12 max-w-2xl">
        <AffiliateDisclosure />
        <p className="text-foreground/60 mt-3 text-xs leading-relaxed">
          Saiba como trabalhamos na{" "}
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

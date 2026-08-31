import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que é o PreçoCaindo e por que ele existe.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Sobre o PreçoCaindo</h1>
      <div className="text-foreground/80 mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          O PreçoCaindo é uma plataforma brasileira de inteligência de compra.
          Nossa promessa é simples: ajudar você a descobrir o que comprar e a
          hora certa de comprar, comparando o preço atual de um produto ao seu
          próprio histórico — não apenas ao preço de tabela.
        </p>
        <p>
          A compra sempre acontece na loja parceira. O PreçoCaindo não vende
          produtos diretamente e não deve transformar uma relação comercial em
          argumento de qualidade.
        </p>
        <p>
          Nossas análises e o Score PreçoCaindo são calculados com metodologia
          própria e transparente — veja os detalhes em{" "}
          <a className="text-brand underline" href="/transparencia">
            Transparência
          </a>{" "}
          e{" "}
          <a className="text-brand underline" href="/metodologia">
            Metodologia
          </a>
          .
        </p>
      </div>
    </div>
  );
}

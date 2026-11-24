import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso do PreçoCaindo.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Termos de uso</h1>
      <div className="text-foreground/80 mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          O PreçoCaindo é um serviço editorial e de comparação de preços. Não
          vendemos produtos diretamente; a compra sempre acontece no site da
          loja parceira.
        </p>
        <p>
          Preços, disponibilidade e informações de produtos podem mudar a
          qualquer momento e são de responsabilidade do marketplace onde a
          compra é realizada. Fazemos o possível para manter os dados
          atualizados, mas não garantimos que o preço exibido seja idêntico ao
          preço no momento da sua compra.
        </p>
        <p>
          O Score PreçoCaindo é uma análise própria, baseada em metodologia
          pública (veja{" "}
          <a className="text-brand underline" href="/metodologia">
            Metodologia
          </a>
          ), e não constitui garantia de que um preço não vá cair ainda mais no
          futuro.
        </p>
        <p>
          O PreçoCaindo pode ganhar comissão sobre compras feitas a partir de
          links comerciais identificados, sem custo adicional para você. Essa
          comissão não deve alterar artificialmente preço, histórico, score ou
          decisão editorial.
        </p>
      </div>
    </div>
  );
}

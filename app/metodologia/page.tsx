import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologia",
  description: "Como o Score PreçoCaindo é calculado, sub-nota por sub-nota.",
  alternates: { canonical: "/metodologia" },
};

const FACTORS = [
  {
    name: "Preço vs. histórico (30%)",
    body: "Compara o preço atual à média móvel de 30 dias coletada pelo PreçoCaindo.",
  },
  {
    name: "Proximidade do menor preço (20%)",
    body: "Quanto mais perto do menor preço já observado, maior a pontuação.",
  },
  {
    name: "Disponibilidade (15%)",
    body: "Produtos fora de estoque têm a pontuação reduzida, independentemente do preço.",
  },
  {
    name: "Desconto aparente (15%)",
    body: "Desconto informado pela Amazon em relação ao preço de tabela do produto.",
  },
  {
    name: "Avaliação (10%)",
    body: "Nota média de avaliações de compradores na Amazon, quando disponível.",
  },
  {
    name: "Número de avaliações (10%)",
    body: "Quantidade de avaliações, em escala logarítmica — reduz o peso de produtos com poucas avaliações.",
  },
];

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Metodologia</h1>
      <p className="text-foreground/80 mt-4 text-sm leading-relaxed">
        O Score PreçoCaindo vai de 0 a 100 e é sempre calculado por uma fórmula
        determinística — nunca por um modelo de linguagem. Quando o histórico de
        um produto ainda é curto, não atribuímos um rótulo preciso: mostramos
        &ldquo;Ainda estamos acompanhando este preço.&rdquo;
      </p>
      <div className="mt-6 space-y-4">
        {FACTORS.map((factor) => (
          <div
            key={factor.name}
            className="border-border-subtle rounded-lg border p-4"
          >
            <h2 className="text-sm font-semibold">{factor.name}</h2>
            <p className="text-foreground/70 mt-1 text-sm">{factor.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-base font-semibold">Faixas de resultado</h2>
      <ul className="text-foreground/80 mt-3 space-y-1 text-sm">
        <li>90–100: Excelente preço</li>
        <li>75–89: Bom momento para comprar</li>
        <li>55–74: Preço razoável</li>
        <li>35–54: Talvez valha esperar</li>
        <li>0–34: Preço alto em relação ao histórico</li>
      </ul>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Como o PreçoCaindo coleta preços, calcula o Score e decide o que publicar.",
  alternates: { canonical: "/como-funciona" },
};

const STEPS = [
  {
    title: "Acompanhamento",
    body: "Passamos a observar o preço de um produto a partir do momento em que ele entra no nosso catálogo, e seguimos registrando esse histórico ao longo do tempo.",
  },
  {
    title: "Cálculo do Score",
    body: "Uma fórmula própria e determinística compara o preço atual ao histórico, ao menor preço já visto, ao desconto aparente, à avaliação e à disponibilidade — sem usar inteligência artificial para decidir o número.",
  },
  {
    title: "Conteúdo editorial",
    body: "Guias e comparações passam por um controle de qualidade antes de serem publicados: precisam agregar valor além da ficha do produto e não podem afirmar nada que não esteja nos dados disponíveis.",
  },
  {
    title: "Você decide",
    body: "Mostramos os dados e a análise; a decisão de compra é sempre sua, e a compra sempre acontece no site da Amazon.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Como funciona</h1>
      <ol className="mt-6 space-y-6">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="bg-brand text-brand-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {i + 1}
            </span>
            <div>
              <h2 className="text-sm font-semibold">{step.title}</h2>
              <p className="text-foreground/80 mt-1 text-sm leading-relaxed">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

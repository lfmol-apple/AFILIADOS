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
    body: "Passamos a observar o preço de um produto a partir do momento em que ele entra no nosso catálogo, e seguimos registrando esse histórico legítimo ao longo do tempo.",
  },
  {
    title: "Decisão de compra",
    body: "Uma fórmula própria e determinística traduz preço atual, histórico, disponibilidade e confiança em uma resposta clara: comprar agora, preço razoável, melhor esperar ou dados insuficientes.",
  },
  {
    title: "Conteúdo editorial",
    body: "Guias e comparações passam por um controle de qualidade antes de serem publicados: precisam agregar valor além da ficha do produto e não podem afirmar nada que não esteja nos dados disponíveis.",
  },
  {
    title: "Você decide",
    body: "Mostramos dados e análise; a decisão final é sua. Se o preço não estiver bom, a evolução natural é criar um alerta quando o envio estiver habilitado.",
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

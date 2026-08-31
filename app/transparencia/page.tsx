import type { Metadata } from "next";
import { amazonDisclosure } from "@/lib/amazon/disclosure";

export const metadata: Metadata = {
  title: "Transparência",
  description:
    "Como o PreçoCaindo funciona, como ganhamos dinheiro e como calculamos nossas recomendações.",
  alternates: { canonical: "/transparencia" },
};

export default function TransparenciaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Transparência</h1>

      <div className="text-foreground/80 mt-8 space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground text-base font-semibold">
            Como ganhamos dinheiro
          </h2>
          <p className="mt-2">
            O PreçoCaindo pode participar de programas de afiliados e receber
            comissão quando uma compra acontece por determinados links. Quando
            um link for da Amazon, usamos a declaração exigida pelo programa:{" "}
            {amazonDisclosure} Isso não deve aumentar o preço pago por você e
            não pode alterar artificialmente nosso histórico, score ou decisão.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Como calculamos o Score PreçoCaindo
          </h2>
          <p className="mt-2">
            O Score é calculado por uma fórmula própria e determinística — não
            por inteligência artificial — que considera o preço atual em relação
            ao histórico que coletamos, a proximidade do menor preço já
            observado, o desconto aparente quando houver fonte legítima, sinais
            de popularidade quando existirem, e a disponibilidade do produto no
            momento. Rankings e análises não são fabricados para maximizar
            comissão.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Sobre o histórico de preços
          </h2>
          <p className="mt-2">
            Nosso histórico começa no dia em que passamos a acompanhar cada
            produto. Nunca afirmamos ter dados de um período que não coletamos —
            se um produto está conosco há 5 dias, mostramos 5 dias, não uma
            estimativa de 90.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Preços e disponibilidade podem mudar
          </h2>
          <p className="mt-2">
            Os preços exibidos refletem a última verificação feita pelo
            PreçoCaindo e podem mudar a qualquer momento na loja. Sempre confira
            o preço atual na página do produto antes de finalizar a compra.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Onde a compra acontece
          </h2>
          <p className="mt-2">
            O PreçoCaindo é um serviço editorial e de comparação de preços. Não
            vendemos produtos diretamente — a compra sempre acontece na loja
            parceira.
          </p>
        </section>
      </div>
    </div>
  );
}

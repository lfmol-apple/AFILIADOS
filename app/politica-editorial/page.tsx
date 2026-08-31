import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política editorial",
  description:
    "Como o PreçoCaindo produz conteúdo, calcula decisões de compra e separa análise editorial de relações comerciais.",
  alternates: { canonical: "/politica-editorial" },
};

export default function PoliticaEditorialPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Política editorial</h1>
      <div className="text-foreground/80 mt-6 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground text-base font-semibold">
            Para que o conteúdo existe
          </h2>
          <p className="mt-2">
            O PreçoCaindo publica análises, guias e páginas de produto para
            ajudar pessoas a decidir se faz sentido comprar agora ou esperar.
            Uma página só deve existir quando acrescenta contexto útil: preço,
            histórico, comparação, critérios de decisão ou explicação prática. O
            princípio é conteúdo primeiro, monetização depois.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Como produzimos
          </h2>
          <p className="mt-2">
            Conteúdos usam dados legítimos disponíveis no sistema e orientação
            editorial própria. Não copiamos descrições de lojas, avaliações de
            compradores ou reviews externos. Quando falta dado suficiente, a
            resposta correta é declarar a limitação, não preencher lacunas com
            suposições.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Relações comerciais
          </h2>
          <p className="mt-2">
            O PreçoCaindo pode receber comissão quando uma compra acontece por
            determinados links. Essa relação não deve alterar artificialmente
            preço, histórico, score, ranking principal ou veredito de compra.
            Empates comerciais reais podem ser considerados internamente, mas
            nunca apresentados como vantagem objetiva inexistente. O PreçoCaindo
            não vende produtos; a compra acontece no varejista parceiro.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Correções e atualização
          </h2>
          <p className="mt-2">
            Preços e disponibilidade mudam. Sempre que detectarmos erro
            material, a informação deve ser corrigida. Guias editoriais exibem
            data de publicação e atualização para que o leitor entenda o grau de
            atualidade do conteúdo.
          </p>
        </section>

        <p>
          Veja também{" "}
          <Link href="/transparencia" className="text-brand underline">
            Transparência
          </Link>{" "}
          e{" "}
          <Link href="/metodologia" className="text-brand underline">
            Metodologia
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

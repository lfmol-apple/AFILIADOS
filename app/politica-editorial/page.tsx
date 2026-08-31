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

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Como escolhemos os temas
          </h2>
          <p className="mt-2">
            Um tema entra na pauta quando existe uma dúvida real e recorrente
            de quem está decidindo uma compra — não porque um produto tem
            comissão maior. Categorias amplas (eletrodomésticos, eletrônicos,
            planejamento financeiro de compra) são priorizadas quando o guia
            consegue ensinar um método que continua útil independente do
            produto específico do momento. Um tema só é publicado quando dá
            para escrever com informação verificável; se a única forma de
            preencher a página fosse inventando dado, o tema fica de fora.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Como usamos dado
          </h2>
          <p className="mt-2">
            Preço, histórico e score usados no site vêm de observação direta
            do PreçoCaindo ou de fonte oficial verificável, nunca de
            estimativa apresentada como fato. Quando um dado não existe ou é
            insuficiente (histórico curto, produto recém-cadastrado), a página
            mostra essa limitação explicitamente em vez de aproximar um
            número. Nenhum benchmark, teste de laboratório, pesquisa de
            mercado ou opinião de consumidor é atribuído ao PreçoCaindo sem
            termos feito ou coletado aquilo de fato.
          </p>
        </section>

        <section>
          <h2 className="text-foreground text-base font-semibold">
            Contra conteúdo em massa
          </h2>
          <p className="mt-2">
            O PreçoCaindo não gera páginas em lote a partir de um mesmo molde
            trocando apenas palavras-chave. Cada guia e cada página de produto
            precisa passar por revisão editorial antes de publicar, e nenhuma
            automação publica conteúdo sozinha sem essa checagem. A regra é
            simples:{" "}
            <strong className="text-foreground">
              se uma página não continuar útil sem links comerciais, ela não
              deve ser publicada.
            </strong>
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

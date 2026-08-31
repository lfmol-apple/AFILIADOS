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
          O problema que resolvemos é simples de descrever e difícil de
          resolver bem: um preço riscado na vitrine não diz se aquele valor é
          realmente bom. Para responder isso de verdade é preciso acompanhar
          o comportamento real de cada produto ao longo do tempo — não apenas
          o instante em que alguém olha a página. É esse histórico, coletado
          diretamente por nós, que sustenta o Score e as comparações que
          publicamos.
        </p>
        <p>
          Além do histórico de preço, o PreçoCaindo mantém guias editoriais
          próprios — sobre como comparar embalagens, parcelamento, promoções
          sazonais e categorias específicas como air fryer, celular, TV e
          robô aspirador — pensados para continuar úteis mesmo quando não há
          nenhum produto específico para comprar naquele momento. Também
          publicamos ferramentas simples (comparador de preço por unidade,
          simulador de parcelamento, calculadora de desconto real) que qualquer
          pessoa pode usar sem depender do nosso catálogo.
        </p>
        <p>
          Independência comercial é uma decisão de arquitetura, não uma
          promessa vaga: comissão de afiliado, quando existe, nunca altera o
          histórico registrado, o cálculo do Score ou o conteúdo editorial de
          um guia. Veja os detalhes em{" "}
          <a className="text-brand underline" href="/transparencia">
            Transparência
          </a>
          ,{" "}
          <a className="text-brand underline" href="/metodologia">
            Metodologia
          </a>{" "}
          e{" "}
          <a className="text-brand underline" href="/politica-editorial">
            Política editorial
          </a>
          .
        </p>
      </div>
    </div>
  );
}

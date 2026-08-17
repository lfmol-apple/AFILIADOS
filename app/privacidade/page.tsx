import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Quais dados o PreçoCaindo coleta e como eles são usados, em conformidade com a LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Política de privacidade</h1>
      <div className="text-foreground/80 mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          O PreçoCaindo coleta o mínimo necessário para funcionar. Ao clicar em
          um link para a Amazon, registramos apenas o produto, a página de
          origem e o momento do clique — sem armazenar endereço IP completo ou
          outros dados pessoais desnecessários.
        </p>
        <p>
          Não criamos perfis individuais de visitantes, não tentamos identificar
          compradores da Amazon e não correlacionamos dados de clique com
          identidade pessoal.
        </p>
        <p>
          Se, no futuro, oferecermos alertas de preço por e-mail, o endereço
          informado será usado exclusivamente para esse fim, mediante
          consentimento explícito, e poderá ser removido a qualquer momento a
          pedido do titular.
        </p>
        <p>
          Esta política é regida pela Lei Geral de Proteção de Dados (Lei nº
          13.709/2018). Dúvidas ou solicitações sobre seus dados podem ser
          enviadas pelos canais indicados na página{" "}
          <a className="text-brand underline" href="/transparencia">
            Transparência
          </a>
          .
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato",
  description: "Como falar com o PreçoCaindo.",
  alternates: { canonical: "/contato" },
};

const CONTACT_EMAIL = "lfmol@yahoo.com.br";

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Contato</h1>
      <div className="text-foreground/80 mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          Encontrou um erro em algum preço, histórico ou guia? Tem uma
          sugestão de produto ou categoria para acompanharmos? Escreva para
          nós:
        </p>
        <p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-brand text-base font-semibold underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-foreground/60 text-xs">
          O PreçoCaindo é um serviço editorial e de comparação de preços — não
          vendemos produtos diretamente. Para dúvidas sobre um pedido, entrega
          ou pagamento, procure diretamente o atendimento da loja onde a
          compra foi feita.
        </p>
      </div>
    </div>
  );
}

/**
 * Lista fechada de elementos autorizados (owner's directive, 2026-11-20,
 * "NÃO aprove a segunda versão do criativo" — item 1): tudo que pode
 * aparecer na peça final vem exclusivamente do anúncio real já
 * verificado em outro lugar do sistema. Nada aqui é inventado; isto só
 * REGISTRA, de forma auditável, o que já é real — usado tanto para
 * montar o prompt de geração (cenário apenas, nunca conteúdo comercial)
 * quanto para alimentar a auditoria visual automática (quality-
 * control.ts) que compara a imagem final contra esta lista.
 */

export interface AuthorizedElements {
  productTitle: string;
  brand: string | null;
  /** A foto real do produto, exatamente como está no anúncio — o único
   * objeto físico que pode aparecer na imagem. */
  realProductPhotoUrl: string;
  /** Preço atual e, só quando confirmado, o preço de referência —
   * nunca um terceiro valor. */
  currentPrice: number;
  referencePrice: number | null;
  /** Textos curtos já extraídos de fontes reais (desconto confirmado,
   * especificação do próprio título, avaliação real) — nunca uma frase
   * de marketing genérica. */
  confirmedFacts: string[];
}

export function buildAuthorizedElements(input: {
  productTitle: string;
  brand: string | null;
  realProductPhotoUrl: string;
  currentPrice: number;
  referencePrice: number | null;
  confirmedFacts: string[];
}): AuthorizedElements {
  return { ...input };
}

/** Descrição textual da lista fechada, para uso tanto no prompt de
 * geração (cenário) quanto no prompt da auditoria visual. */
export function describeAuthorizedElements(list: AuthorizedElements): string {
  const lines = [
    `Produto real e único objeto físico autorizado na imagem: "${list.productTitle}"${list.brand ? ` (marca: ${list.brand})` : ""}.`,
    `Preço real: R$ ${list.currentPrice.toFixed(2)}${list.referencePrice ? ` (preço anterior real: R$ ${list.referencePrice.toFixed(2)})` : ""}.`,
  ];
  if (list.confirmedFacts.length > 0) {
    lines.push(`Fatos reais já confirmados: ${list.confirmedFacts.join("; ")}.`);
  }
  lines.push(
    "NENHUM outro objeto, produto, embalagem, acessório, brinde, livro, e-book, pessoa ou item comercializável pode aparecer na imagem além do produto real acima.",
  );
  return lines.join(" ");
}

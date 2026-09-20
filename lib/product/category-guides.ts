/**
 * Short, generic buying guidance per /ofertas category. Deliberately says
 * nothing about a specific product, price or brand — it is advice on what to
 * check before buying in that category, so it is always true and never
 * fabricated. Shown on product pages so each page carries useful text beyond
 * the price.
 */
export interface CategoryGuide {
  heading: string;
  checks: string[];
}

export const CATEGORY_GUIDES: Record<string, CategoryGuide> = {
  "esporte-suplementos": {
    heading: "Antes de comprar suplementos e itens de treino",
    checks: [
      "Confira a data de validade e o lote no anúncio ou com o vendedor; produto perto de vencer não compensa o desconto.",
      "Compare o preço por dose ou por quilo, não só o preço da embalagem: potes de tamanhos diferentes enganam.",
      "Prefira vendedores com reputação alta e envio pela própria loja oficial da marca.",
      "Para equipamentos, veja o peso máximo suportado e as dimensões montadas.",
    ],
  },
  celulares: {
    heading: "Antes de comprar celulares e acessórios",
    checks: [
      "Confirme memória, armazenamento e se o aparelho é nacional, com nota fiscal e garantia no Brasil.",
      "Para carregadores e cabos, veja a potência em watts e se o conector combina com o seu aparelho.",
      "Power banks: compare a capacidade em mAh e a potência de saída, e desconfie de valores irreais para o tamanho.",
      "Leia as avaliações mais recentes: qualidade de acessório muda de lote para lote.",
    ],
  },
  "audio-games": {
    heading: "Antes de comprar áudio, TV e games",
    checks: [
      "Verifique compatibilidade: plataforma do console ou jogo, versão do Bluetooth e conectores da TV.",
      "Em TVs, olhe a resolução, o tamanho da tela e se há suporte de parede incluso ou à parte.",
      "Fones: veja se há microfone, tempo de bateria e se o modelo é sem fio ou com fio.",
      "Compre com nota fiscal; eletrônicos costumam ter garantia de 12 meses.",
    ],
  },
  informatica: {
    heading: "Antes de comprar itens de informática e impressão 3D",
    checks: [
      "Confirme compatibilidade com o seu equipamento: conector, modelo da impressora, tipo de memória ou disco.",
      "Filamentos: veja o material (PLA, PETG, ABS), o diâmetro e o peso do carretel.",
      "Cartões de memória e SSDs: compare classe de velocidade e capacidade real, e cuide com preços muito abaixo do mercado.",
      "Leia os comentários sobre defeito e devolução antes de fechar.",
    ],
  },
  eletrodomesticos: {
    heading: "Antes de comprar eletrodomésticos",
    checks: [
      "Veja a tensão (110 V, 220 V ou bivolt) e confirme com a rede da sua casa.",
      "Compare potência e capacidade, e o consumo de energia quando o anúncio informar.",
      "Confira o prazo de garantia e se existe assistência técnica na sua região.",
      "Verifique as dimensões para caber no espaço onde vai ficar.",
    ],
  },
  casa: {
    heading: "Antes de comprar itens para a casa",
    checks: [
      "Meça o espaço e compare com as dimensões do anúncio: tamanho é o erro mais comum.",
      "Em cama, mesa e banho, confira o material, a gramatura e o tamanho (solteiro, casal, queen).",
      "Veja se o kit inclui todas as peças mostradas nas fotos.",
      "Cores podem variar entre tela e produto; leia as avaliações com foto de clientes.",
    ],
  },
  limpeza: {
    heading: "Antes de comprar produtos de limpeza e papel",
    checks: [
      "Compare o preço por unidade, por litro ou por metro, não o preço do pacote.",
      "Confira a quantidade real do kit: folhas por rolo, litros por embalagem e número de unidades.",
      "Para compras recorrentes, veja se o frete compensa ao levar mais de uma unidade.",
    ],
  },
  beleza: {
    heading: "Antes de comprar beleza e cuidados pessoais",
    checks: [
      "Confira se o produto é original e vendido pela marca ou por revendedor autorizado.",
      "Veja a validade, o volume e, se tiver pele sensível, a lista de ingredientes.",
      "Compare o preço por mililitro ou por grama entre embalagens diferentes.",
    ],
  },
  bebe: {
    heading: "Antes de comprar itens de bebê",
    checks: [
      "Fraldas: confira o tamanho pelo peso do bebê e compare o preço por unidade.",
      "Mamadeiras e acessórios: procure selo do Inmetro e material livre de BPA quando informado.",
      "Para produtos de segurança, siga a faixa de idade e peso indicada pelo fabricante.",
    ],
  },
  pet: {
    heading: "Antes de comprar produtos pet",
    checks: [
      "Ração: confira a faixa de idade e porte do animal e compare o preço por quilo.",
      "Antipulgas e medicamentos: use o produto certo para a espécie e o peso do seu animal; em dúvida, consulte o veterinário.",
      "Camas e acessórios: meça o seu pet e compare com as dimensões do anúncio.",
    ],
  },
  ferramentas: {
    heading: "Antes de comprar ferramentas e itens de jardim",
    checks: [
      "Veja a tensão ou a bateria: ferramentas sem fio pedem bateria e carregador inclusos ou à parte.",
      "Confira a potência, a rotação e os acessórios que acompanham o produto.",
      "Para lâmpadas, compare a potência em watts, o brilho em lúmens e o tipo de soquete.",
    ],
  },
  moda: {
    heading: "Antes de comprar moda e acessórios",
    checks: [
      "Consulte a tabela de medidas do anúncio; a numeração varia entre marcas.",
      "Veja a política de troca e devolução da loja antes de comprar.",
      "Olhe as fotos de clientes nas avaliações para conferir caimento e cor reais.",
    ],
  },
};

export const DEFAULT_GUIDE: CategoryGuide = {
  heading: "Antes de comprar",
  checks: [
    "Leia a descrição completa e as avaliações mais recentes, principalmente as mais críticas.",
    "Confira a reputação do vendedor, o prazo de entrega e a política de devolução.",
    "Compare o preço final, com frete, em mais de uma loja antes de decidir.",
  ],
};

export function guideForCategory(
  slug: string | null | undefined,
): CategoryGuide {
  return (slug && CATEGORY_GUIDES[slug]) || DEFAULT_GUIDE;
}

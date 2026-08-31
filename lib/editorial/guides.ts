export type GuideCategory =
  "Decisão de compra" | "Histórico de preços" | "Comparação" | "Planejamento";

export type GuideTool =
  | "unit-comparison"
  | "installment-comparison"
  | "real-discount"
  | "target-price"
  | null;

export interface GuideSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: GuideCategory;
  author: "Equipe PreçoCaindo";
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  hero: {
    label: string;
    alt: string;
  };
  tool: GuideTool;
  sections: GuideSection[];
  relatedSlugs: string[];
  seo: {
    title: string;
    description: string;
  };
}

const publishedAt = "2026-08-30";
const author = "Equipe PreçoCaindo" as const;

export const GUIDES: Guide[] = [
  {
    slug: "como-saber-se-uma-promocao-e-realmente-boa",
    title: "Como saber se uma promoção é realmente boa",
    description:
      "Aprenda a separar desconto útil de preço maquiado usando histórico, preço atual e contexto de compra.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Promoção real",
      alt: "Arte editorial do PreçoCaindo sobre análise de promoção real",
    },
    tool: null,
    relatedSlugs: [
      "como-funciona-o-historico-de-precos",
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "como-definir-um-preco-alvo-antes-de-comprar",
    ],
    seo: {
      title: "Como saber se uma promoção é realmente boa",
      description:
        "Critérios práticos para avaliar uma promoção antes de comprar: histórico, preço médio, menor preço e urgência real.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Uma promoção é boa quando o preço atual está abaixo de uma referência legítima, como o histórico recente do próprio produto, e quando o produto atende à sua necessidade real. Um desconto escrito na vitrine não prova nada sozinho.",
          "O erro comum é comparar o preço promocional apenas com o preço riscado. Esse preço de referência pode estar desatualizado, inflado ou simplesmente não representar o valor pelo qual o produto costuma ser vendido.",
        ],
      },
      {
        heading: "O que comparar antes de decidir",
        body: [
          "Comece pelo histórico. Se o produto custou valores parecidos durante várias semanas, uma queda pequena pode ser apenas oscilação normal. Se caiu bastante em relação à média dos últimos dias e ficou perto do menor preço observado, o sinal é mais forte.",
          "Depois compare lojas. Às vezes uma loja mostra desconto maior, mas o preço final com frete, prazo ou condição de pagamento fica pior. A melhor compra é o menor custo real para você, não o maior percentual de desconto.",
        ],
        bullets: [
          "Preço atual contra média recente.",
          "Distância até o menor preço observado.",
          "Preço final com frete e condição de pagamento.",
          "Necessidade real de comprar agora.",
        ],
      },
      {
        heading: "Erros comuns",
        body: [
          "Comprar porque o timer está acabando é um erro clássico. Se o preço não é bom no histórico, urgência visual não muda a conta. Outro erro é comprar um modelo parecido achando que é o mesmo produto; pequenas diferenças de capacidade, voltagem, geração ou tamanho mudam o valor da comparação.",
          "Também vale desconfiar de descontos altos em produtos pouco conhecidos quando não há dados suficientes. Sem histórico, a resposta honesta é esperar mais informação ou comparar manualmente em várias lojas.",
        ],
      },
      {
        heading: "Conclusão prática",
        body: [
          "Uma boa promoção combina preço abaixo da referência, produto certo e condição de compra clara. Se faltar histórico, trate como hipótese, não como oportunidade confirmada.",
        ],
      },
    ],
  },
  {
    slug: "como-saber-se-vale-a-pena-comprar-agora",
    title: "Comprar agora ou esperar: quais fatores analisar",
    description:
      "Um método simples para decidir entre comprar hoje ou esperar uma queda melhor.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Comprar ou esperar",
      alt: "Arte editorial sobre decisão de compra agora ou depois",
    },
    tool: null,
    relatedSlugs: [
      "como-definir-um-preco-alvo-antes-de-comprar",
      "quando-vale-a-pena-esperar-a-black-friday",
      "como-evitar-falsas-promocoes",
    ],
    seo: {
      title: "Comprar agora ou esperar? Como decidir com dados",
      description:
        "Veja como avaliar preço atual, histórico e urgência para decidir se compra agora ou espera.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Vale a pena comprar agora quando o preço está bom em relação ao histórico, a diferença para esperar é pequena e você realmente precisa do produto. Vale esperar quando o preço atual está acima da média recente ou quando falta dado suficiente para avaliar.",
          "A decisão não precisa ser emocional. Um bom processo reduz impulso: defina o produto certo, consulte a referência de preço e compare alternativas equivalentes.",
        ],
      },
      {
        heading: "Use quatro perguntas",
        body: [
          "A primeira pergunta é se o produto é exatamente o que você quer. Comparar preços de itens diferentes cria uma falsa economia. A segunda é se o preço atual está abaixo da média que você consegue observar. A terceira é se há eventos próximos, como troca de geração, liquidação sazonal ou data promocional. A quarta é se esperar tem custo para você.",
          "Se você precisa de um item para trabalho, reposição imediata ou presente com prazo, pagar um pouco acima do menor histórico pode ser racional. Se é compra de desejo, esperar um preço-alvo costuma ser melhor.",
        ],
        bullets: [
          "É o produto exato ou apenas parecido?",
          "O preço está abaixo, dentro ou acima do histórico?",
          "Há motivo plausível para cair em breve?",
          "Qual é o custo real de esperar?",
        ],
      },
      {
        heading: "Como o PreçoCaindo ajuda",
        body: [
          "O PreçoCaindo transforma sinais de preço em uma decisão legível. Quando há histórico suficiente, mostramos se o preço está interessante, razoável ou se é melhor esperar. Quando não há dados suficientes, dizemos isso claramente.",
          "Essa transparência importa porque uma compra ruim geralmente nasce de excesso de confiança. Melhor uma resposta cautelosa do que um selo chamativo sem base.",
        ],
      },
    ],
  },
  {
    slug: "como-funciona-o-historico-de-precos",
    title: "Como funciona o histórico de preços",
    description:
      "Entenda o que um histórico de preços mostra, o que ele não mostra e como usar esse dado sem exagerar.",
    category: "Histórico de preços",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Histórico",
      alt: "Arte editorial com linha de histórico de preços",
    },
    tool: null,
    relatedSlugs: [
      "como-saber-se-uma-promocao-e-realmente-boa",
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "como-evitar-falsas-promocoes",
    ],
    seo: {
      title: "Como funciona o histórico de preços",
      description:
        "Saiba como interpretar histórico de preços, média recente, menor preço observado e cobertura temporal.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Histórico de preços é uma sequência de observações reais feitas ao longo do tempo. Ele ajuda a responder se o preço atual está barato, normal ou caro em comparação com o comportamento recente do mesmo produto.",
          "Ele não é uma bola de cristal. Um histórico bom mostra o que já aconteceu, não garante o próximo preço. Ainda assim, costuma ser muito melhor do que decidir olhando apenas o desconto do dia.",
        ],
      },
      {
        heading: "Três cuidados importantes",
        body: [
          "O primeiro cuidado é a cobertura temporal. Um produto acompanhado por dois dias não tem o mesmo peso de um produto observado por meses. O segundo é a quantidade de observações. Poucos pontos podem esconder oscilações normais. O terceiro é a qualidade do identificador: comparar o modelo errado invalida a leitura.",
          "Por isso o PreçoCaindo prefere dizer que ainda não há dados suficientes quando o histórico é curto. Essa é uma decisão de produto, não uma limitação visual.",
        ],
        bullets: [
          "Cobertura: há quantos dias acompanhamos?",
          "Observações: quantos preços reais existem?",
          "Identidade: é o mesmo produto, variante e loja?",
        ],
      },
      {
        heading: "Média, mínimo e posição histórica",
        body: [
          "A média ajuda a entender o preço normal. O menor preço observado mostra uma referência otimista, mas nem sempre repetível. A posição histórica indica se o preço atual está mais perto do topo ou do fundo do intervalo que vimos.",
          "Um bom preço costuma estar abaixo da média e próximo do menor observado. Mas a decisão final também deve considerar frete, prazo, disponibilidade e necessidade.",
        ],
      },
    ],
  },
  {
    slug: "menor-preco-nem-sempre-e-a-melhor-compra",
    title: "Menor preço nem sempre é a melhor compra",
    description:
      "Preço baixo importa, mas não deve esconder frete, prazo, confiabilidade, versão do produto e custo de uso.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "6 min",
    hero: {
      label: "Preço final",
      alt: "Arte editorial sobre preço final e qualidade da decisão",
    },
    tool: null,
    relatedSlugs: [
      "como-comparar-o-mesmo-produto-em-lojas-diferentes",
      "parcelado-ou-a-vista-como-comparar-corretamente",
      "como-comparar-preco-por-kg-litro-ou-unidade",
    ],
    seo: {
      title: "Menor preço nem sempre é a melhor compra",
      description:
        "Entenda quando o menor preço pode esconder uma compra pior e como comparar o custo real.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "O menor preço só é a melhor compra quando o produto é equivalente, a loja é confiável, o frete não anula a vantagem e a condição de pagamento serve para você. Fora disso, ele pode ser apenas o menor número na tela.",
        ],
      },
      {
        heading: "O que pode mudar a conta",
        body: [
          "Frete e prazo são os fatores mais óbvios. Um produto R$ 20 mais barato com frete alto ou entrega lenta pode ser pior. A versão também pesa: voltagem, tamanho, memória, geração, kit incluso e garantia podem mudar completamente o valor.",
          "Outro ponto é o custo de uso. Um produto barato que consome mais refil, energia, tinta, cápsula ou manutenção pode sair caro no mês seguinte.",
        ],
        bullets: [
          "Frete e prazo de entrega.",
          "Versão exata do produto.",
          "Garantia e política de troca.",
          "Custo por uso, unidade, kg ou litro.",
        ],
      },
      {
        heading: "Conclusão prática",
        body: [
          "Use o menor preço como ponto de partida, não como decisão automática. A compra boa é a que reduz custo total sem aumentar risco de arrependimento.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-preco-por-kg-litro-ou-unidade",
    title: "Como comparar preço por kg, litro ou unidade",
    description:
      "Veja como transformar pacotes diferentes em uma comparação justa por unidade econômica.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Preço unitário",
      alt: "Arte editorial sobre comparação de preço por unidade",
    },
    tool: "unit-comparison",
    relatedSlugs: [
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "parcelado-ou-a-vista-como-comparar-corretamente",
      "como-comparar-o-mesmo-produto-em-lojas-diferentes",
    ],
    seo: {
      title: "Como comparar preço por kg, litro ou unidade",
      description:
        "Aprenda a calcular preço por kg, litro ou unidade para comparar embalagens diferentes corretamente.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Para comparar embalagens diferentes, divida o preço pela quantidade útil. Um pacote de 5 kg por R$ 100 custa R$ 20/kg. Um pacote de 3 kg por R$ 72 custa R$ 24/kg. O primeiro é mais barato por kg, mesmo parecendo mais caro no caixa.",
        ],
      },
      {
        heading: "Quando usar cada unidade",
        body: [
          "Use kg para alimentos, areia, ração e produtos vendidos por peso. Use litro ou ml para líquidos. Use unidade para cápsulas, fraldas, pilhas, lâminas ou itens contáveis. O importante é comparar a mesma unidade entre opções equivalentes.",
          "A unidade econômica não resolve tudo. Ela não avalia qualidade, rendimento real, validade ou preferência. Ela apenas impede uma comparação injusta entre tamanhos diferentes.",
        ],
        bullets: [
          "Preço por kg: preço dividido pelo peso em kg.",
          "Preço por litro: preço dividido pelo volume em litros.",
          "Preço por unidade: preço dividido pela quantidade de itens.",
        ],
      },
      {
        heading: "Erro comum",
        body: [
          "O erro é achar que pacote maior sempre compensa. Se você não usa tudo antes de vencer, não tem espaço para armazenar ou precisa parcelar com juros, o preço por unidade menor pode ser anulando por outros custos.",
        ],
      },
    ],
  },
  {
    slug: "parcelado-ou-a-vista-como-comparar-corretamente",
    title: "Parcelado ou à vista: como comparar corretamente",
    description:
      "Compare preço à vista, parcelamento, desconto e juros sem cair em falsa economia.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "À vista ou parcelado",
      alt: "Arte editorial sobre comparação de pagamento à vista e parcelado",
    },
    tool: "installment-comparison",
    relatedSlugs: [
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "como-definir-um-preco-alvo-antes-de-comprar",
    ],
    seo: {
      title: "Parcelado ou à vista: como comparar corretamente",
      description:
        "Critérios para avaliar desconto à vista, parcelamento sem juros e custo total antes de comprar.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Compare sempre o custo total. Se o parcelamento tem juros, some tudo. Se o à vista tem desconto, compare o valor final com o total parcelado. Se ambos têm o mesmo preço e o parcelamento não compromete seu orçamento, a decisão passa a ser financeira, não de promoção.",
        ],
      },
      {
        heading: "A conta básica",
        body: [
          "Preço à vista é simples: valor pago hoje. Parcelado exige olhar número de parcelas, valor da parcela e juros embutido. Uma oferta de 10x pode parecer leve no mês, mas custar mais no total.",
          "Também existe o custo de oportunidade. Se o desconto à vista é pequeno e você precisa manter caixa para algo essencial, parcelar sem juros pode fazer sentido. Se o desconto à vista é relevante, pagar hoje pode ser melhor.",
        ],
      },
      {
        heading: "Checklist",
        body: [],
        bullets: [
          "Qual é o preço final à vista?",
          "Qual é o total pago no parcelamento?",
          "Existe juros, taxa ou diferença de frete?",
          "A parcela cabe no orçamento dos próximos meses?",
        ],
      },
    ],
  },
  {
    slug: "quando-vale-a-pena-esperar-a-black-friday",
    title: "Quando vale a pena esperar a Black Friday",
    description:
      "Nem toda compra melhora na Black Friday. Veja quando esperar faz sentido e quando pode ser perda de tempo.",
    category: "Planejamento",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Black Friday",
      alt: "Arte editorial sobre planejamento para Black Friday",
    },
    tool: null,
    relatedSlugs: [
      "como-definir-um-preco-alvo-antes-de-comprar",
      "como-evitar-falsas-promocoes",
      "como-saber-se-vale-a-pena-comprar-agora",
    ],
    seo: {
      title: "Quando vale a pena esperar a Black Friday",
      description:
        "Aprenda a decidir se vale esperar a Black Friday usando histórico, necessidade e preço-alvo.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Vale esperar a Black Friday quando a compra não é urgente, o produto costuma ter variação relevante de preço e você definiu um preço-alvo antes da data. Não vale esperar quando o produto é necessário agora, está perto do menor preço observado ou tem risco de estoque limitado.",
        ],
      },
      {
        heading: "Prepare o preço-alvo antes",
        body: [
          "A pior forma de comprar em Black Friday é decidir tudo no dia. O ideal é escolher modelos antes, acompanhar histórico e escrever o preço que faria sentido pagar. Assim você evita ser guiado por porcentagem de desconto.",
          "Também compare versões. Muitas promoções usam variações antigas, kits diferentes ou especificações menores. Se o produto não é equivalente ao que você pesquisou, o desconto não é comparável.",
        ],
      },
      {
        heading: "Quando comprar antes",
        body: [
          "Se o preço atual já está muito bom e você precisa do produto, comprar antes pode ser racional. Esperar por uma queda incerta pode significar perder disponibilidade, prazo de entrega ou uma condição que já era suficiente.",
        ],
      },
    ],
  },
  {
    slug: "como-definir-um-preco-alvo-antes-de-comprar",
    title: "Como definir um preço-alvo antes de comprar",
    description:
      "Defina um preço justo antes de procurar promoção e reduza compra por impulso.",
    category: "Planejamento",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Preço-alvo",
      alt: "Arte editorial sobre definição de preço-alvo",
    },
    tool: "target-price",
    relatedSlugs: [
      "como-saber-se-vale-a-pena-comprar-agora",
      "quando-vale-a-pena-esperar-a-black-friday",
      "como-evitar-falsas-promocoes",
    ],
    seo: {
      title: "Como definir um preço-alvo antes de comprar",
      description:
        "Veja como definir preço-alvo com histórico, orçamento e urgência antes de comprar.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Preço-alvo é o valor que torna a compra justificável para você antes de ver a promoção. Ele pode ser baseado no histórico do produto, no seu orçamento e na urgência da compra.",
        ],
      },
      {
        heading: "Como escolher o número",
        body: [
          "Comece observando a faixa recente de preço. Se o produto costuma ficar entre R$ 300 e R$ 380, um alvo de R$ 250 talvez seja raro demais; um alvo de R$ 310 pode ser realista. Depois olhe seu orçamento: um preço bom que cria dívida ruim não é uma boa compra.",
          "A urgência ajusta o alvo. Para compra essencial, aceitar um preço razoável pode ser correto. Para compra opcional, espere um desconto mais forte.",
        ],
      },
      {
        heading: "Use alertas com critério",
        body: [
          "Um alerta de preço deve refletir uma decisão tomada antes. Ele evita checar lojas toda hora e reduz a chance de comprar por pressão. Quando o alerta tocar, ainda confira frete, prazo e especificação.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-o-mesmo-produto-em-lojas-diferentes",
    title: "Como comparar o mesmo produto em lojas diferentes",
    description:
      "Veja como garantir que duas ofertas são realmente do mesmo produto antes de escolher a loja.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Multiloja",
      alt: "Arte editorial sobre comparação do mesmo produto em lojas diferentes",
    },
    tool: null,
    relatedSlugs: [
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "parcelado-ou-a-vista-como-comparar-corretamente",
      "como-saber-se-uma-promocao-e-realmente-boa",
    ],
    seo: {
      title: "Como comparar o mesmo produto em lojas diferentes",
      description:
        "Critérios para comparar ofertas multiloja sem confundir modelos, kits ou condições diferentes.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Antes de comparar lojas, confirme que é o mesmo produto: modelo, versão, cor, capacidade, voltagem, quantidade e kit incluso. Só depois compare preço, frete, prazo, disponibilidade e política de troca.",
        ],
      },
      {
        heading: "O identificador importa",
        body: [
          "Produtos parecidos podem ter nomes quase iguais. Em eletrônicos, uma letra no modelo muda geração ou configuração. Em alimentos e itens recorrentes, peso e quantidade mudam o custo real. Em produtos importados, versão regional e garantia podem variar.",
          "Quando existir EAN, GTIN, ASIN, SKU ou modelo oficial, use esse identificador como apoio. Ele não substitui a leitura da página, mas reduz erro.",
        ],
      },
      {
        heading: "A comparação justa",
        body: [
          "Com produtos equivalentes, calcule o preço final. Some frete, considere prazo e olhe condição de pagamento. Se a diferença for pequena, confiabilidade, troca e experiência anterior com a loja podem pesar mais que alguns reais.",
        ],
      },
    ],
  },
  {
    slug: "como-evitar-falsas-promocoes",
    title: "Como evitar falsas promoções",
    description:
      "Sinais práticos para reconhecer descontos fracos, preço de referência duvidoso e pressão artificial.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Compra consciente",
      alt: "Arte editorial sobre evitar falsas promoções",
    },
    tool: null,
    relatedSlugs: [
      "como-saber-se-uma-promocao-e-realmente-boa",
      "como-funciona-o-historico-de-precos",
      "quando-vale-a-pena-esperar-a-black-friday",
    ],
    seo: {
      title: "Como evitar falsas promoções",
      description:
        "Aprenda a identificar falsas promoções olhando histórico, preço final e pressão de compra.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Falsa promoção é aquela que parece vantajosa, mas não melhora o custo real para o comprador. Pode acontecer por preço riscado exagerado, frete alto, modelo inferior, desconto comum apresentado como raro ou urgência artificial.",
        ],
      },
      {
        heading: "Sinais de atenção",
        body: [
          "O primeiro sinal é desconto muito alto sem histórico que confirme. O segundo é preço final parecido com o normal depois de incluir frete. O terceiro é página que destaca urgência, mas esconde especificação importante. O quarto é troca de versão: você pesquisou um modelo e a oferta é de outro.",
          "Nenhum sinal isolado prova má-fé. O objetivo é reduzir risco. Se a conta não fecha, espere ou compare melhor.",
        ],
        bullets: [
          "Preço riscado sem referência confiável.",
          "Frete ou prazo que anulam a vantagem.",
          "Modelo parecido, mas não idêntico.",
          "Urgência visual maior que a informação técnica.",
        ],
      },
      {
        heading: "Conclusão prática",
        body: [
          "A melhor defesa contra falsa promoção é ter referência antes do impulso. Histórico, preço-alvo e comparação entre lojas tornam a decisão mais calma.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-precos-sem-cair-em-falso-desconto",
    title: "Como comparar preços sem cair em falso desconto",
    description:
      "Um roteiro prático para separar queda real de preço riscado exagerado, frete alto e urgência artificial.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Desconto real",
      alt: "Arte editorial sobre cálculo de desconto real",
    },
    tool: "real-discount",
    relatedSlugs: [
      "como-saber-se-uma-promocao-e-realmente-boa",
      "como-funciona-o-historico-de-precos",
      "menor-preco-historico-o-que-isso-realmente-significa",
    ],
    seo: {
      title: "Como comparar preços sem cair em falso desconto",
      description:
        "Aprenda a calcular desconto real e conferir se uma oferta melhora o custo final antes de comprar.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Falso desconto aparece quando a loja destaca uma queda que não melhora o custo real. Pode ser um preço anterior pouco representativo, frete maior, parcelamento pior ou uma versão diferente do produto.",
          "A comparação honesta começa pelo valor que você de fato pagaria hoje e pela referência usada para dizer que houve desconto.",
        ],
      },
      {
        heading: "Faça a conta nominal",
        body: [
          "Se um produto sai de R$ 500 para R$ 425, a queda nominal é R$ 75 e o desconto é 15%. Essa conta é simples, mas depende da qualidade do preço anterior. Um preço anterior informado pela loja não é automaticamente igual ao histórico observado.",
        ],
        bullets: [
          "Preço anterior confiável.",
          "Preço atual final, incluindo custos obrigatórios.",
          "Mesma versão, tamanho e condição de pagamento.",
          "Histórico suficiente para saber se a queda é incomum.",
        ],
      },
      {
        heading: "Quando desconfiar",
        body: [
          "Desconfie quando o desconto é grande, mas o preço final parece comum em outras lojas. Também desconfie quando o anúncio muda detalhes discretos: voltagem, capacidade, geração, quantidade de unidades ou garantia.",
          "A conclusão do PreçoCaindo deve ser conservadora quando falta dado. Melhor dizer que a evidência é insuficiente do que transformar um preço comum em oportunidade.",
        ],
      },
    ],
  },
  {
    slug: "menor-preco-historico-o-que-isso-realmente-significa",
    title: "Menor preço histórico: o que isso realmente significa",
    description:
      "Entenda por que menor preço observado é uma referência útil, mas não uma promessa de que a oferta voltará.",
    category: "Histórico de preços",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Menor histórico",
      alt: "Arte editorial sobre menor preço histórico",
    },
    tool: null,
    relatedSlugs: [
      "como-funciona-o-historico-de-precos",
      "como-saber-se-vale-a-pena-comprar-agora",
      "quando-vale-a-pena-esperar-a-black-friday",
    ],
    seo: {
      title: "Menor preço histórico: como interpretar",
      description:
        "Veja como usar menor preço observado sem confundir histórico com previsão ou garantia de promoção futura.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Menor preço histórico é o menor valor observado dentro do período acompanhado. Ele não significa menor preço desde o lançamento do produto, nem garante que aquele valor voltará.",
        ],
      },
      {
        heading: "Cobertura muda tudo",
        body: [
          "Um menor preço observado em 10 dias vale menos que um menor preço observado em seis meses. A cobertura indica o tamanho da janela analisada. Sem essa informação, o número pode parecer mais forte do que realmente é.",
          "Por isso o PreçoCaindo deve mostrar quando ainda há pouco histórico e evitar conclusões fortes em produtos recém-monitorados.",
        ],
      },
      {
        heading: "Como usar na decisão",
        body: [
          "Se o preço atual está perto do menor observado e abaixo da média recente, o sinal é positivo. Se está distante do menor e acima da média, talvez valha esperar. Se a compra é urgente, a comparação precisa considerar o custo de adiar.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-embalagens-de-tamanhos-diferentes",
    title: "Como comparar embalagens de tamanhos diferentes",
    description:
      "Compare pacotes, refis e kits pelo custo proporcional sem ignorar validade, espaço e consumo real.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Embalagens",
      alt: "Arte editorial sobre comparação de embalagens",
    },
    tool: "unit-comparison",
    relatedSlugs: [
      "como-comparar-preco-por-kg-litro-ou-unidade",
      "como-economizar-em-compras-recorrentes",
      "menor-preco-nem-sempre-e-a-melhor-compra",
    ],
    seo: {
      title: "Como comparar embalagens de tamanhos diferentes",
      description:
        "Aprenda a comparar embalagens por kg, litro ou unidade considerando custo final e desperdício.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Transforme tudo para a mesma base: preço por kg, litro, 100 g ou unidade. Só depois avalie se o pacote maior realmente faz sentido para seu consumo.",
        ],
      },
      {
        heading: "Pacote maior nem sempre vence",
        body: [
          "A embalagem maior costuma reduzir o custo proporcional, mas pode ser pior se vencer antes do uso, ocupar espaço demais ou exigir desembolso alto em um mês apertado. Custo por unidade é uma referência, não uma ordem de compra.",
        ],
      },
      {
        heading: "Exemplo simples",
        body: [
          "Um produto de 900 g por R$ 28,90 custa cerca de R$ 32,11/kg. Outro de 1,2 kg por R$ 35,90 custa cerca de R$ 29,92/kg. O segundo é mais barato por kg, mas só compensa se você realmente usar tudo.",
        ],
      },
    ],
  },
  {
    slug: "como-escolher-uma-air-fryer-sem-olhar-apenas-o-preco",
    title: "Como escolher uma air fryer sem olhar apenas o preço",
    description:
      "Capacidade, espaço, potência, limpeza e garantia podem importar mais do que o menor preço do dia.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Air fryer",
      alt: "Arte editorial sobre escolha de air fryer",
    },
    tool: null,
    relatedSlugs: [
      "como-saber-se-vale-a-pena-comprar-agora",
      "como-comparar-precos-sem-cair-em-falso-desconto",
      "parcelado-ou-a-vista-como-comparar-corretamente",
    ],
    seo: {
      title: "Como escolher uma air fryer pelo custo-benefício",
      description:
        "Critérios práticos para comparar air fryer por capacidade, uso real, limpeza, garantia e preço.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "A melhor air fryer não é apenas a mais barata. Compare capacidade útil, tamanho na bancada, facilidade de limpeza, potência, garantia e disponibilidade de peças antes de olhar o preço.",
        ],
      },
      {
        heading: "Capacidade útil",
        body: [
          "A capacidade anunciada não conta a história inteira. Uma família maior pode precisar de cesto mais amplo; uma pessoa sozinha pode preferir modelo compacto. Comprar grande demais ocupa espaço e pode virar custo sem benefício.",
        ],
      },
      {
        heading: "Quando o desconto vale",
        body: [
          "Um desconto é mais interessante quando aparece em um modelo que você já comparou. Se a oferta força troca para uma marca desconhecida ou uma capacidade inadequada, o preço menor pode gerar arrependimento.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-celulares-alem-do-preco",
    title: "Como comparar celulares além do preço",
    description:
      "Compare celular por atualização, memória, câmera, bateria, garantia e ciclo de uso, não apenas pelo desconto.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "9 min",
    hero: {
      label: "Celulares",
      alt: "Arte editorial sobre comparação de celulares",
    },
    tool: null,
    relatedSlugs: [
      "como-comparar-o-mesmo-produto-em-lojas-diferentes",
      "menor-preco-historico-o-que-isso-realmente-significa",
      "parcelado-ou-a-vista-como-comparar-corretamente",
    ],
    seo: {
      title: "Como comparar celulares além do preço",
      description:
        "Critérios para escolher celular olhando memória, bateria, câmera, atualizações e custo total.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Preço baixo em celular só é bom quando o aparelho atende ao seu ciclo de uso. Memória insuficiente, bateria fraca ou pouco suporte de atualização podem encurtar a vida útil e aumentar o custo por ano.",
        ],
      },
      {
        heading: "Compare o modelo exato",
        body: [
          "O mesmo nome comercial pode aparecer com memória, armazenamento, cor e conectividade diferentes. Antes de comparar preço, confira código do modelo, armazenamento, RAM, garantia e se é vendido oficialmente no Brasil.",
        ],
      },
      {
        heading: "Custo por ano de uso",
        body: [
          "Um celular de R$ 2.000 usado por quatro anos custa R$ 500 por ano. Um de R$ 1.500 que fica ruim em dois anos custa R$ 750 por ano. Essa conta não substitui preferência, mas ajuda a evitar economia falsa.",
        ],
      },
    ],
  },
  {
    slug: "como-escolher-um-robo-aspirador-pelo-custo-beneficio",
    title: "Como escolher um robô aspirador pelo custo-benefício",
    description:
      "Mapeamento, sucção, manutenção, peças e tamanho da casa mudam a relação entre preço e benefício.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Robô aspirador",
      alt: "Arte editorial sobre robô aspirador",
    },
    tool: null,
    relatedSlugs: [
      "menor-preco-nem-sempre-e-a-melhor-compra",
      "como-economizar-em-compras-recorrentes",
      "como-comparar-precos-sem-cair-em-falso-desconto",
    ],
    seo: {
      title: "Como escolher robô aspirador pelo custo-benefício",
      description:
        "Veja como comparar robô aspirador por mapeamento, manutenção, peças e uso real da casa.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Robô aspirador barato pode compensar em ambientes simples, mas casas maiores, tapetes e muitos obstáculos geralmente exigem melhor navegação, bateria e disponibilidade de peças.",
        ],
      },
      {
        heading: "Manutenção entra no preço",
        body: [
          "Escovas, filtros e pano de limpeza têm troca periódica. Se as peças são caras ou difíceis de encontrar, o preço inicial menor pode perder força depois de alguns meses.",
        ],
      },
      {
        heading: "Quando esperar",
        body: [
          "Vale esperar quando você já sabe o modelo ideal e o preço atual está acima da média. Não vale trocar para um modelo sem mapeamento ou sem peças apenas porque apareceu uma oferta chamativa.",
        ],
      },
    ],
  },
  {
    slug: "como-comparar-televisores-antes-de-comprar",
    title: "Como comparar televisores antes de comprar",
    description:
      "Tamanho, painel, brilho, sistema, entradas e distância de uso valem mais que percentual de desconto isolado.",
    category: "Comparação",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "9 min",
    hero: {
      label: "Televisores",
      alt: "Arte editorial sobre comparação de TVs",
    },
    tool: null,
    relatedSlugs: [
      "como-comparar-o-mesmo-produto-em-lojas-diferentes",
      "quando-vale-a-pena-esperar-a-black-friday",
      "menor-preco-historico-o-que-isso-realmente-significa",
    ],
    seo: {
      title: "Como comparar televisores antes de comprar",
      description:
        "Critérios para comparar TVs por tamanho, painel, recursos, entradas e custo real.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Antes de comparar preço de TV, defina tamanho adequado, tipo de painel, brilho esperado, sistema operacional, quantidade de HDMI e distância do sofá. Depois compare o modelo exato.",
        ],
      },
      {
        heading: "Tamanho não é tudo",
        body: [
          "Uma TV maior pode parecer melhor, mas distância curta, painel inferior ou brilho baixo podem piorar a experiência. Em sala clara, brilho e tratamento de reflexo pesam muito. Para videogame, entradas e taxa de atualização podem importar mais.",
        ],
      },
      {
        heading: "Promoção de geração antiga",
        body: [
          "Modelos antigos podem valer a pena quando o preço cai bastante e os recursos atendem. O risco é comprar uma TV com sistema lento, poucas atualizações ou recurso ausente que você só percebe depois.",
        ],
      },
    ],
  },
  {
    slug: "como-economizar-em-compras-recorrentes",
    title: "Como economizar em compras recorrentes",
    description:
      "Use frequência de consumo, estoque seguro, preço por unidade e alertas para reduzir gasto sem acumular excesso.",
    category: "Planejamento",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "8 min",
    hero: {
      label: "Compras recorrentes",
      alt: "Arte editorial sobre economia em compras recorrentes",
    },
    tool: "unit-comparison",
    relatedSlugs: [
      "como-comparar-embalagens-de-tamanhos-diferentes",
      "como-comparar-preco-por-kg-litro-ou-unidade",
      "como-definir-um-preco-alvo-antes-de-comprar",
    ],
    seo: {
      title: "Como economizar em compras recorrentes",
      description:
        "Planeje compras recorrentes com preço por unidade, estoque mínimo e alertas de preço.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "Para economizar em compras recorrentes, descubra quanto você consome por mês, acompanhe preço por unidade e compre antes da urgência. Compra emergencial reduz seu poder de comparar.",
        ],
      },
      {
        heading: "Estoque seguro",
        body: [
          "Ter uma unidade reserva pode evitar pagar caro quando acaba. Mas estoque grande demais prende dinheiro, ocupa espaço e pode vencer. O equilíbrio depende de validade, frequência de uso e variação de preço.",
        ],
      },
      {
        heading: "Use alertas com critério",
        body: [
          "Defina preço-alvo antes de precisar comprar. Quando o valor cair, compre apenas o necessário para atravessar o próximo ciclo de consumo. Promoção boa não obriga estoque exagerado.",
        ],
      },
    ],
  },
  {
    slug: "como-o-score-precocaindo-ajuda-a-avaliar-uma-oportunidade",
    title: "Como o Score PreçoCaindo ajuda a avaliar uma oportunidade",
    description:
      "Entenda o que o Score resume, quais sinais entram na conta e por que ele não substitui sua decisão.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    readingTime: "7 min",
    hero: {
      label: "Score PreçoCaindo",
      alt: "Arte editorial sobre o Score PreçoCaindo",
    },
    tool: null,
    relatedSlugs: [
      "como-funciona-o-historico-de-precos",
      "como-saber-se-vale-a-pena-comprar-agora",
      "como-saber-se-uma-promocao-e-realmente-boa",
    ],
    seo: {
      title: "Como o Score PreçoCaindo avalia oportunidades",
      description:
        "Veja como o Score combina histórico, preço atual e evidência disponível para apoiar sua decisão.",
    },
    sections: [
      {
        heading: "Resposta rápida",
        body: [
          "O Score PreçoCaindo resume sinais objetivos em uma escala de 0 a 100. Ele ajuda a priorizar oportunidades, mas não deve substituir critérios pessoais como urgência, orçamento e uso real.",
        ],
      },
      {
        heading: "O que entra na leitura",
        body: [
          "O cálculo considera preço atual contra histórico, proximidade do menor preço observado, disponibilidade e outros sinais quando existem dados legítimos. Quando falta histórico, a resposta correta é cautela.",
        ],
      },
      {
        heading: "Como usar sem exagerar",
        body: [
          "Score alto indica que vale olhar com atenção. Score baixo indica que talvez seja melhor esperar. A decisão final ainda depende de frete, prazo, versão exata e necessidade.",
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

export function getRelatedGuides(guide: Guide): Guide[] {
  return guide.relatedSlugs
    .map((slug) => getGuideBySlug(slug))
    .filter((related): related is Guide => Boolean(related));
}

export function getGuideCategories(): GuideCategory[] {
  return Array.from(new Set(GUIDES.map((guide) => guide.category)));
}

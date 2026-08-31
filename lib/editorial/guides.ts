export type GuideCategory =
  "Decisão de compra" | "Histórico de preços" | "Comparação" | "Planejamento";

export type GuideDepth = "standard" | "deep";

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
  depth: GuideDepth;
  wordCount: number;
  readingMinutes: number;
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

type BaseGuide = Omit<Guide, "wordCount" | "readingMinutes" | "readingTime">;

const publishedAt = "2026-08-30";
const author = "Equipe PreçoCaindo" as const;

const BASE_GUIDES = [
  {
    slug: "como-saber-se-uma-promocao-e-realmente-boa",
    title: "Como saber se uma promoção é realmente boa",
    description:
      "Aprenda a separar desconto útil de preço maquiado usando histórico, preço atual e contexto de compra.",
    category: "Decisão de compra",
    author,
    publishedAt,
    updatedAt: publishedAt,
    depth: "standard",
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
      {
        heading: "O que olhar antes de clicar em comprar",
        body: [
          "A vitrine costuma destacar urgência e percentual, mas a decisão boa depende de referência, necessidade e custo final — três coisas que um selo de desconto não prova sozinho.",
          "Cinco perguntas resolvem a maior parte dos casos: o preço atual está abaixo do histórico recente do mesmo produto? O preço final muda com frete, prazo ou condição de pagamento? O desconto anunciado vira economia útil para a sua compra específica? Modelo, tamanho, voltagem, geração e itens inclusos batem com o que você pesquisou? A urgência é sua ou foi criada pela comunicação da loja?",
        ],
        bullets: [
          "comparar o preço atual com o histórico recente do mesmo produto",
          "verificar se o preço final muda com frete, prazo ou condição de pagamento",
          "separar desconto anunciado de economia útil para a sua compra",
          "confirmar modelo, tamanho, voltagem, geração e itens inclusos",
          "avaliar se a urgência é sua ou foi criada pela comunicação da loja",
        ],
      },
      {
        heading: "Um exemplo que muda a decisão",
        body: [
          "Imagine dois anúncios do mesmo produto. Um mostra desconto maior, mas cobra frete e entrega em prazo pior; o outro tem desconto menor, preço final mais baixo e troca mais simples. A segunda opção pode ser a promoção real, mesmo parecendo menos chamativa no cartaz.",
        ],
      },
      {
        heading: "Quando a promoção não compensa",
        body: [
          "Contador regressivo não é dado, é design de urgência. Comparar o produto atual com uma versão antiga ou menor também derruba a comparação, assim como ignorar frete e prazo ou tratar preço riscado como prova suficiente por si só.",
        ],
        bullets: [
          "comprar só porque há contador regressivo",
          "comparar o produto atual com uma versão antiga ou menor",
          "ignorar frete e prazo",
          "tratar preço riscado como prova suficiente",
        ],
      },
      {
        heading: "Quando a promoção realmente vale",
        body: [
          "O sinal fica forte quando o preço atual está abaixo da referência observada, o produto é exatamente o modelo desejado, o custo final cabe no orçamento sem empurrar dívida ruim, e esperar teria custo maior que a economia provável.",
        ],
        bullets: [
          "o preço atual está abaixo da referência observada",
          "o produto é exatamente o modelo desejado",
          "o custo final cabe no orçamento sem empurrar dívida ruim",
          "esperar tem custo maior que a economia provável",
        ],
      },
      {
        heading: "Limites desta análise",
        body: [
          "Histórico curto reduz a confiança do sinal, preço pode mudar depois da leitura, e diferenças pequenas podem ser apenas ruído normal do varejo — não uma tendência real.",
        ],
        bullets: [
          "histórico curto reduz confiança",
          "preço pode mudar depois da leitura",
          "diferenças pequenas podem ser ruído normal do varejo",
        ],
      },
      {
        heading: "Checklist antes de fechar a compra",
        body: [],
        bullets: [
          "modelo e versão conferidos",
          "preço final calculado",
          "histórico consultado",
          "necessidade real confirmada",
          "alternativa equivalente comparada",
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
    depth: "standard",
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
      {
        heading: "Por trás da dúvida entre comprar e esperar",
        body: [
          "A dúvida raramente é só sobre preço. Ela mistura urgência, substitutos disponíveis, risco de o estoque acabar, orçamento e a chance real de o produto cair mais nas próximas semanas.",
          "Cinco passos organizam a decisão: definir o produto exato antes de olhar ofertas, comparar preço atual com menor preço observado e média recente, medir o custo de esperar (trabalho, presente, reposição, conforto), identificar datas ou trocas de geração que possam mexer no preço, e decidir um preço-alvo antes de entrar em qualquer página de compra.",
        ],
        bullets: [
          "definir o produto exato antes de olhar ofertas",
          "comparar preço atual, menor preço observado e média recente",
          "medir o custo de esperar para trabalho, presente, reposição ou conforto",
          "identificar datas ou trocas de geração que possam alterar o preço",
          "decidir um preço-alvo antes de entrar em páginas de compra",
        ],
      },
      {
        heading: "Dois cenários opostos",
        body: [
          "Se um item é necessário para trabalhar amanhã, esperar por uma queda incerta pode custar mais que a economia. Se é uma compra de desejo e o histórico mostra oscilações frequentes, a decisão prudente pode ser criar um alerta e esperar o próprio ritmo do mercado.",
        ],
      },
      {
        heading: "O que costuma sair caro",
        body: [
          "Comprar só para não perder uma oferta, sem saber se ela é realmente boa, é o erro mais comum. Logo depois vem trocar necessidade por impulso de oportunidade, esperar indefinidamente por uma queda irreal, e parcelar sem comparar o total efetivamente pago.",
        ],
        bullets: [
          "comprar para não perder uma oferta sem saber se ela é boa",
          "trocar necessidade por impulso de oportunidade",
          "esperar indefinidamente por uma queda irreal",
          "parcelar sem comparar o total efetivamente pago",
        ],
      },
      {
        heading: "Sinais de que vale comprar agora",
        body: [
          "O preço está perto de uma referência forte, a compra resolve uma necessidade atual, a diferença esperada por esperar é pequena, e o produto tem garantia e condição de troca adequadas.",
        ],
        bullets: [
          "o preço está perto de uma referência forte",
          "a compra resolve uma necessidade atual",
          "a diferença esperada por esperar é pequena",
          "o produto tem garantia e condição de troca adequadas",
        ],
      },
      {
        heading: "O que este método não garante",
        body: [
          "Nenhum histórico garante preço futuro, datas promocionais podem ter estoque limitado, e o melhor momento de compra depende do seu uso — não só do formato do gráfico.",
        ],
        bullets: [
          "nenhum histórico garante preço futuro",
          "datas promocionais podem ter estoque limitado",
          "o melhor momento depende do seu uso, não só do gráfico",
        ],
      },
      {
        heading: "Checklist antes de decidir",
        body: [],
        bullets: [
          "necessidade classificada como urgente ou flexível",
          "preço-alvo definido",
          "alternativas equivalentes vistas",
          "condição de pagamento entendida",
          "decisão registrada antes do checkout",
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
    depth: "standard",
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
      {
        heading: "Histórico é comparação, não promessa",
        body: [
          "Histórico é uma ferramenta de comparação, não uma promessa. Ele mostra como aquele produto se comportou dentro da janela observada — nada além disso.",
          "Cinco cuidados evitam leitura errada: olhar a quantidade de observações antes de confiar no padrão, distinguir menor preço observado de menor preço provável, comparar sempre o mesmo produto (não versões parecidas), avaliar se houve mudança de estoque, vendedor ou condição, e usar a média recente junto com o preço mínimo e o preço atual — nunca um número isolado.",
        ],
        bullets: [
          "olhar a quantidade de observações antes de confiar no padrão",
          "distinguir menor preço observado de menor preço provável",
          "comparar o mesmo produto, não versões parecidas",
          "avaliar se houve mudança de estoque, vendedor ou condição",
          "usar média recente junto com preço mínimo e preço atual",
        ],
      },
      {
        heading: "Duas janelas de observação, duas conclusões",
        body: [
          "Um produto observado por poucos dias pode parecer barato apenas porque não há base suficiente. Já um item acompanhado por várias semanas permite notar se a queda atual é rara, comum ou apenas uma volta ao preço normal.",
        ],
      },
      {
        heading: "Leituras que atrapalham",
        body: [
          "Ler o menor preço como meta obrigatória distorce a decisão. Comparar histórico de kits diferentes, ignorar variações de frete e assumir que o gráfico prevê o futuro são os outros três erros mais comuns nessa leitura.",
        ],
        bullets: [
          "ler o menor preço como meta obrigatória",
          "comparar histórico de kits diferentes",
          "ignorar variações de frete",
          "assumir que o gráfico prevê o futuro",
        ],
      },
      {
        heading: "Quando o histórico dá confiança",
        body: [
          "A leitura fica sólida quando há observações suficientes, o produto e a loja permanecem consistentes ao longo do tempo, a queda é relevante frente à média, e a decisão combina com a sua urgência real.",
        ],
        bullets: [
          "há observações suficientes",
          "o produto e a loja são consistentes",
          "a queda é relevante em relação à média",
          "a decisão combina com sua urgência",
        ],
      },
      {
        heading: "O que o histórico não resolve sozinho",
        body: [
          "Mudanças de vendedor podem alterar a série sem aviso, erros de cadastro exigem revisão humana, e histórico de preço não mede qualidade do produto — são coisas diferentes.",
        ],
        bullets: [
          "mudanças de vendedor podem alterar a série",
          "erros de cadastro exigem revisão humana",
          "histórico não mede qualidade do produto",
        ],
      },
      {
        heading: "Checklist de leitura",
        body: [],
        bullets: [
          "janela de observação entendida",
          "menor preço interpretado com cautela",
          "média recente comparada",
          "frete e prazo separados do gráfico",
          "produto exato validado",
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
    depth: "standard",
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
      {
        heading: "Onde o custo real se esconde",
        body: [
          "Menor preço é um sinal importante, mas pode esconder prazo ruim, versão inferior, garantia frágil, frete alto ou custo de uso maior — e nenhuma dessas coisas aparece no número riscado da vitrine.",
          "Cinco verificações fecham a conta de verdade: calcular o preço final (não só o preço de vitrine), confirmar versão, capacidade, geração e acessórios inclusos, considerar custo de manutenção, refil, energia ou reposição, avaliar prazo de entrega e política de troca, e comparar durabilidade esperada apenas como critério geral — nunca inventando número específico.",
        ],
        bullets: [
          "calcular preço final e não apenas preço de vitrine",
          "confirmar versão, capacidade, geração e acessórios inclusos",
          "considerar custo de manutenção, refil, energia ou reposição",
          "avaliar prazo de entrega e política de troca",
          "comparar durabilidade esperada como critério geral, sem inventar números",
        ],
      },
      {
        heading: "Um exemplo comum",
        body: [
          "Uma impressora barata pode não ser a melhor se o custo dos suprimentos comprometer o uso. Um eletrodoméstico um pouco mais caro pode ser melhor se tiver assistência, peça disponível e a capacidade certa para a casa.",
        ],
      },
      {
        heading: "Armadilhas do menor preço",
        body: [
          "Comprar a variante menor por engano, ignorar custo recorrente, escolher loja sem política de troca clara e deixar o menor preço substituir a necessidade real — essas quatro armadilhas aparecem com frequência em comparações apressadas.",
        ],
        bullets: [
          "comprar variante menor por engano",
          "ignorar custo recorrente",
          "escolher loja sem política clara",
          "deixar o menor preço substituir a necessidade real",
        ],
      },
      {
        heading: "Quando o menor preço realmente vence",
        body: [
          "Ele vence quando os produtos comparados são de fato equivalentes, o preço final permanece menor depois de somar tudo, o risco de troca é aceitável, e a versão atende ao uso que você pretende dar.",
        ],
        bullets: [
          "os produtos comparados são equivalentes",
          "o preço final permanece menor",
          "o risco de troca é aceitável",
          "a versão atende ao uso previsto",
        ],
      },
      {
        heading: "Limites da comparação",
        body: [
          "Custo de uso depende do perfil de cada pessoa, qualidade não cabe inteira em um número de preço, e informações incompletas exigem cautela em vez de conclusão apressada.",
        ],
        bullets: [
          "custo de uso depende do perfil de cada pessoa",
          "qualidade não cabe inteira em preço",
          "informações incompletas exigem cautela",
        ],
      },
      {
        heading: "Um exemplo do dia a dia",
        body: [
          "Duas cafeteiras custam praticamente o mesmo valor. Uma usa cápsula proprietária vendida só pela marca; a outra aceita cápsula compatível de várias marcas, geralmente mais barata. No primeiro ano de uso, o custo do café consumido pode superar a diferença de preço entre as duas máquinas — e isso não aparece em nenhuma etiqueta na hora da compra.",
          "O mesmo raciocínio vale para impressora, aspirador com saco descartável e qualquer aparelho que dependa de suprimento contínuo. O preço do aparelho é só a primeira parcela de um custo que continua depois da compra.",
        ],
      },
      {
        heading: "Checklist final",
        body: [],
        bullets: [
          "preço final calculado",
          "versão conferida",
          "garantia lida",
          "custo recorrente considerado",
          "loja e prazo comparados",
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
    depth: "standard",
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
      {
        heading: "Por que embalagens confundem",
        body: [
          "Embalagens diferentes confundem porque o preço total chama atenção, mas a economia de verdade aparece no custo por medida comparável — não no valor que pisca em destaque no rótulo.",
          "Cinco passos evitam a armadilha: converter tudo para a mesma unidade antes de comparar, separar gramas de quilos e mililitros de litros e unidades soltas, considerar validade e espaço de armazenamento, avaliar se você consumirá a quantidade maior sem desperdício, e comparar o preço final com frete quando a compra for online.",
        ],
        bullets: [
          "converter tudo para a mesma unidade antes de comparar",
          "separar gramas de quilos, mililitros de litros e unidades soltas",
          "considerar validade e espaço de armazenamento",
          "avaliar se você consumirá a quantidade maior sem desperdício",
          "comparar preço final com frete quando houver compra online",
        ],
      },
      {
        heading: "O pacote grande só ganha em uma condição",
        body: [
          "Um pacote menor pode custar menos no caixa e mais caro por quilo. O pacote grande só ganha se você realmente consumir tudo no prazo e se o dinheiro parado no estoque não atrapalhar outras compras.",
        ],
      },
      {
        heading: "Erros de conversão comuns",
        body: [
          "Comparar mililitro com grama sem equivalência real, comprar volume grande que vence antes do uso, ignorar concentração ou rendimento, e tratar kit promocional como se fosse unidade simples — esses quatro erros derrubam qualquer conta bem-intencionada.",
        ],
        bullets: [
          "comparar ml com g sem equivalência real",
          "comprar volume grande que vence antes do uso",
          "ignorar concentração, rendimento ou dose",
          "tratar kit promocional como unidade simples",
        ],
      },
      {
        heading: "Quando o cálculo compensa de verdade",
        body: [
          "Compensa quando as unidades foram normalizadas de fato, o consumo recorrente é previsível, o estoque cabe em casa sem aperto, e a diferença por unidade justifica o desembolso maior de uma vez.",
        ],
        bullets: [
          "as unidades foram normalizadas",
          "o consumo recorrente é previsível",
          "o estoque cabe em casa",
          "a diferença por unidade compensa o desembolso maior",
        ],
      },
      {
        heading: "O que o preço por unidade não mede",
        body: [
          "Rendimento declarado pode variar no uso real, produtos concentrados exigem leitura atenta do rótulo, e a comparação numérica não substitui preferência pessoal ou percepção de qualidade.",
        ],
        bullets: [
          "rendimento declarado pode variar no uso real",
          "produtos concentrados exigem leitura do rótulo",
          "a comparação não substitui preferência ou qualidade",
        ],
      },
      {
        heading: "Quando a etiqueta some com pistas importantes",
        body: [
          "Alguns rótulos já trazem o preço por unidade impresso, geralmente em letra pequena perto do preço total — vale procurar antes de fazer a conta manualmente. Quando não vem impresso, uma calculadora simples resolve em segundos e evita erro de arredondamento na comparação.",
        ],
      },
      {
        heading: "Checklist rápido",
        body: [],
        bullets: [
          "quantidades convertidas",
          "preço por kg, litro ou unidade calculado",
          "validade considerada",
          "espaço disponível avaliado",
          "desperdício provável descartado",
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
    depth: "standard",
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
      {
        heading: "Parcelamento muda fluxo de caixa, não o valor da compra",
        body: [
          "Parcelamento muda fluxo de caixa, mas não deveria esconder o custo total. A pergunta certa é quanto você paga no fim e qual flexibilidade ganha ou perde no processo.",
          "Cinco pontos evitam a armadilha da parcela pequena: comparar o total parcelado contra o preço à vista, calcular o valor de cada parcela dentro do orçamento mensal, considerar juros explícitos, descontos à vista e encargos indiretos, avaliar se a compra compromete compras essenciais futuras, e decidir se a liquidez preservada vale uma eventual diferença de preço.",
        ],
        bullets: [
          "comparar total parcelado contra preço à vista",
          "calcular o valor de cada parcela no orçamento mensal",
          "considerar juros explícitos, descontos à vista e encargos indiretos",
          "avaliar se a compra compromete compras essenciais futuras",
          "decidir se a liquidez preservada vale eventual diferença",
        ],
      },
      {
        heading: "Duas situações, duas respostas diferentes",
        body: [
          "Se o preço à vista tem desconto relevante e você tem reserva para pagar, pode fazer sentido quitar. Se o total parcelado é igual e a parcela cabe sem apertar, parcelar pode preservar caixa para imprevistos — sem custo real por isso.",
        ],
      },
      {
        heading: "O que distorce a conta",
        body: [
          "Olhar apenas o valor da parcela sem ver o total, somar várias compras pequenas até travar o limite do cartão, confundir parcela sem juros com compra sem custo nenhum, e comprar só porque a parcela parece baixa — são os quatro deslizes mais comuns.",
        ],
        bullets: [
          "olhar apenas o valor da parcela",
          "somar várias compras pequenas até travar o cartão",
          "confundir parcela sem juros com compra sem custo",
          "comprar porque a parcela parece baixa",
        ],
      },
      {
        heading: "Quando parcelar faz sentido",
        body: [
          "Faz sentido quando o total é igual ou justificável frente ao à vista, a parcela cabe no orçamento sem esforço, a compra já era necessária, e a reserva financeira continua protegida ao final do mês.",
        ],
        bullets: [
          "o total é igual ou justificável",
          "a parcela cabe no orçamento",
          "a compra é necessária",
          "a reserva financeira continua protegida",
        ],
      },
      {
        heading: "Limites desta comparação",
        body: [
          "Cada orçamento tem uma tolerância diferente para comprometimento mensal, o comparador não substitui um planejamento financeiro completo, e regras de cartão e loja podem mudar sem aviso.",
        ],
        bullets: [
          "cada orçamento tem tolerância diferente",
          "o comparador não substitui planejamento financeiro",
          "regras de cartão e loja podem mudar",
        ],
      },
      {
        heading: "Perguntas frequentes sobre parcelamento",
        body: [
          "Parcelar sem juros é sempre neutro? Financeiramente sim, mas comprometer várias parcelas futuras ao mesmo tempo reduz sua margem para lidar com um imprevisto no meio do caminho — um custo real, mesmo sem juros explícito.",
          "Desconto à vista pequeno vale a pena? Depende do que você deixaria de fazer com o dinheiro guardado. Se o desconto é menor do que o rendimento que esse valor teria em uma reserva, parcelar sem juros pode ser a opção mais racional.",
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
    depth: "deep",
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
      {
        heading: "O que a data promocional realmente muda",
        body: [
          "Esperar uma data promocional pode ajudar, mas também cria risco de estoque limitado, logística mais lenta pela concentração de pedidos, e expectativa irreal de desconto alimentada por meses de propaganda.",
          "Seis pontos organizam o planejamento: separar produto urgente de compra flexível, definir preço-alvo antes da data (não durante), acompanhar o histórico do produto nas semanas anteriores à campanha, considerar risco de estoque em modelos muito específicos, comparar preço, frete, prazo e parcelamento no mesmo cálculo, e avaliar se uma troca de geração pode mudar o valor percebido da oferta.",
        ],
        bullets: [
          "separar produto urgente de compra flexível",
          "definir preço-alvo antes da data",
          "acompanhar histórico semanas antes da campanha",
          "considerar risco de estoque em modelos muito específicos",
          "comparar preço, frete, prazo e parcelamento no mesmo cálculo",
          "avaliar se uma geração nova pode mudar o valor percebido",
        ],
      },
      {
        heading: "Produtos sazonais pedem calendário próprio",
        body: [
          "Categorias com forte troca de coleção ou geração — roupas de estação, eletrônicos com lançamento anual, brinquedos de fim de ano — costumam ter padrão de queda concentrado perto da própria data ou logo depois, quando o estoque da geração anterior precisa girar. Já itens de reposição constante (eletrodomésticos básicos, produtos de limpeza, papelaria) tendem a ter variação menor e mais espalhada ao longo do ano, então esperar especificamente a Black Friday rende menos vantagem relativa para eles.",
        ],
      },
      {
        heading: "Para um item substituível ou insubstituível",
        body: [
          "Para um item substituível, esperar pode ser racional. Para uma geladeira quebrada, o custo de esperar pode ser alto. Para um celular específico, o risco pode ser o modelo acabar ou a loja promover apenas uma versão diferente daquela que você pesquisou.",
        ],
      },
      {
        heading: "Erros que custam caro nessa época",
        body: [
          "Comprar só porque é Black Friday, aceitar um preço-alvo definido no calor da data (em vez de antes), ignorar prazo de entrega em um período de alta demanda, e trocar de modelo por causa de desconto sem entender o recurso que está perdendo — esses quatro erros concentram a maior parte do arrependimento pós-compra nessa época.",
        ],
        bullets: [
          "comprar só porque é Black Friday",
          "aceitar preço-alvo definido no calor da data",
          "ignorar prazo de entrega",
          "trocar modelo por desconto sem entender perda de recurso",
        ],
      },
      {
        heading: "Quando vale esperar até a data",
        body: [
          "Vale esperar quando a compra pode aguardar sem prejuízo, existem alternativas equivalentes disponíveis, o preço-alvo já foi definido com antecedência, o histórico mostra margem real para queda, e o estoque do produto não é crítico para o seu caso.",
        ],
        bullets: [
          "a compra pode esperar sem prejuízo",
          "há alternativas equivalentes",
          "o preço-alvo foi definido antes",
          "o histórico mostra margem para queda",
          "o estoque não é crítico para você",
        ],
      },
      {
        heading: "O que a data não garante",
        body: [
          "A data não garante melhor preço para todo produto, promoções costumam focar em modelos específicos escolhidos pela loja, e o volume grande de ofertas simultâneas aumenta o risco de decisão apressada — justamente o oposto do que um preço-alvo bem definido deveria proteger.",
        ],
        bullets: [
          "a data não garante melhor preço",
          "promoções podem focar modelos específicos",
          "o volume de ofertas aumenta risco de decisão apressada",
        ],
      },
      {
        heading: "Perguntas frequentes sobre Black Friday",
        body: [
          "Loja pode subir o preço antes só para descer depois? É um comportamento conhecido e por isso o histórico de várias semanas antes da data vale mais do que o preço riscado mostrado na hora — o desconto só é real quando comparado a um preço que o produto de fato praticou antes.",
          "Vale esperar produto sazonal, como ar-condicionado ou ventilador, para a Black Friday? Depende da época do ano: produtos com demanda sazonal forte (verão, volta às aulas, fim de ano) podem ter preço mais baixo fora do pico de procura do que durante a campanha, quando a demanda por aquele item específico também sobe.",
          "Compra internacional compensa na Black Friday? Pode compensar em preço de etiqueta, mas frete internacional, impostos e prazo de entrega mais longo precisam entrar na mesma conta — sem isso, a comparação com a loja nacional fica incompleta.",
        ],
      },
      {
        heading: "Checklist antes da data chegar",
        body: [],
        bullets: [
          "lista de produtos fechada antes da data",
          "preço-alvo definido",
          "versões equivalentes anotadas",
          "frete e prazo incluídos",
          "limite de orçamento respeitado",
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
    depth: "standard",
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
      {
        heading: "Por que um número definido antes ajuda",
        body: [
          "Preço-alvo reduz impulso porque transforma uma vontade aberta ('quero que fique mais barato') em uma condição objetiva de compra que você pode checar sem depender do humor do dia.",
          "Cinco cuidados tornam a meta realista: partir do menor preço observado sem tratá-lo como garantia de que vai se repetir, usar a média recente para evitar uma meta impossível, considerar a urgência e o custo real de esperar, incluir frete e condição de pagamento na conta (não só o preço do produto), e revisar a meta quando surgirem novas versões ou mudanças na sua necessidade.",
        ],
        bullets: [
          "partir do menor preço observado sem tratá-lo como garantia",
          "usar média recente para evitar meta impossível",
          "considerar urgência e custo de esperar",
          "incluir frete e condição de pagamento",
          "revisar a meta quando surgirem novas versões ou necessidades",
        ],
      },
      {
        heading: "Duas metas, dois perfis de compra",
        body: [
          "Se você quer comprar um item de desejo, um preço-alvo evita aceitar qualquer desconto que apareça. Se precisa do produto logo, a meta pode ser menos agressiva, porque esperar demais também tem um custo — só que menos visível que o preço na tela.",
        ],
      },
      {
        heading: "O que atrapalha a própria meta",
        body: [
          "Definir a meta sem nenhum histórico de referência, mudar o alvo a cada novo anúncio que aparece, ignorar o preço final na hora de comparar, e usar o menor preço já visto como se fosse uma obrigação — esses quatro hábitos anulam a vantagem de ter definido um preço-alvo.",
        ],
        bullets: [
          "definir meta sem histórico",
          "mudar o alvo a cada anúncio",
          "ignorar preço final",
          "usar menor histórico como obrigação",
        ],
      },
      {
        heading: "Quando a meta funciona bem",
        body: [
          "Funciona quando a compra é planejável, existem dados suficientes para servir de referência, você aceita esperar o tempo necessário, e o orçamento para aquela compra já está separado com antecedência.",
        ],
        bullets: [
          "a compra é planejável",
          "há dados suficientes para referência",
          "você aceita esperar",
          "o orçamento já está separado",
        ],
      },
      {
        heading: "Limites de qualquer preço-alvo",
        body: [
          "Um preço-alvo definido baixo demais pode nunca aparecer, o contexto do mercado muda sem aviso, e a meta em si não avalia qualidade — ela só organiza quando comprar, não o quê comprar.",
        ],
        bullets: [
          "um preço-alvo muito baixo pode nunca aparecer",
          "o contexto do mercado muda",
          "a meta não avalia qualidade por si só",
        ],
      },
      {
        heading: "Um exemplo de preço-alvo bem definido",
        body: [
          "Um produto costuma oscilar entre R$ 340 e R$ 420 ao longo de dois meses, com média de R$ 380. Um preço-alvo de R$ 350 é ambicioso, mas plausível; um alvo de R$ 280 provavelmente nunca vai aparecer, porque está fora da faixa que o histórico realmente mostrou. Definir a meta olhando esse intervalo evita tanto a frustração de esperar por um número irreal quanto a pressa de aceitar qualquer desconto pequeno.",
        ],
      },
      {
        heading: "Checklist para fechar a meta",
        body: [],
        bullets: [
          "produto exato escolhido",
          "referência de histórico anotada",
          "preço final incluído",
          "prazo máximo definido",
          "alerta configurado se fizer sentido",
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
    depth: "standard",
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
      {
        heading: "A comparação só existe se o produto for igual",
        body: [
          "Comparar lojas só funciona quando o produto é realmente o mesmo e quando as condições comerciais de cada uma entram na conta — não só o número final na tela.",
          "Cinco verificações protegem essa comparação: validar modelo, cor, voltagem, tamanho, memória ou kit incluso, somar frete e descontos realmente aplicáveis, comparar prazo, troca e garantia lado a lado, verificar se o vendedor é do mesmo tipo de origem (loja oficial, marketplace, terceiro), e não misturar produto nacional, importado e de marketplace sem entender a diferença entre eles.",
        ],
        bullets: [
          "validar modelo, cor, voltagem, tamanho, memória ou kit",
          "somar frete e descontos aplicáveis",
          "comparar prazo, troca e garantia",
          "verificar se o vendedor é o mesmo tipo de origem",
          "não misturar produto nacional, importado e marketplace sem entender diferença",
        ],
      },
      {
        heading: "O nome popular engana",
        body: [
          "Dois anúncios podem ter o mesmo nome popular, mas um incluir acessório, garantia diferente ou outra capacidade. A comparação honesta começa pela ficha técnica do produto, não pelo preço destacado no título.",
        ],
      },
      {
        heading: "O que costuma passar despercebido",
        body: [
          "Confiar só no título do anúncio, comparar prazo normal com entrega expressa como se fossem equivalentes, ignorar que o vendedor é um terceiro dentro do marketplace, e trocar garantia por uma economia pequena sem perceber — são os deslizes mais frequentes nessa comparação.",
        ],
        bullets: [
          "confiar só no título do anúncio",
          "comparar prazo normal com entrega expressa",
          "ignorar vendedor terceiro",
          "trocar garantia por economia pequena sem perceber",
        ],
      },
      {
        heading: "Quando a diferença de loja realmente compensa",
        body: [
          "Compensa quando as fichas técnicas são de fato equivalentes, o preço final já foi calculado com tudo incluso, a política de troca está clara por escrito, e a loja atende ao prazo que você precisa.",
        ],
        bullets: [
          "as fichas são equivalentes",
          "o preço final foi calculado",
          "a política de troca está clara",
          "a loja atende ao seu prazo",
        ],
      },
      {
        heading: "O que essa comparação não cobre",
        body: [
          "Lojas podem mudar preço rapidamente depois da sua consulta, algumas descrições de anúncio são incompletas por natureza, e nenhuma comparação de preço mede o atendimento que você vai receber depois da compra.",
        ],
        bullets: [
          "lojas podem mudar preço rapidamente",
          "algumas descrições são incompletas",
          "a comparação não mede atendimento futuro",
        ],
      },
      {
        heading: "Perguntas frequentes sobre comparação multiloja",
        body: [
          "Comprar do vendedor com mais avaliações é sempre mais seguro? Ajuda, mas não substitui a leitura da ficha do produto — um vendedor bem avaliado pode estar anunciando a versão errada por engano, e a nota de reputação não corrige isso.",
          "Preço mais baixo em marketplace desconhecido vale o risco? Depende da política de reembolso e do prazo de entrega declarado — se a diferença de preço é pequena, uma loja com histórico mais longo costuma reduzir o risco de dor de cabeça depois da compra.",
          "Vale comprar de vendedor internacional dentro do mesmo marketplace? Só quando prazo de entrega, tributação e política de troca internacional estão claros — sem isso, o preço menor pode se transformar em espera maior ou custo extra na alfândega.",
        ],
      },
      {
        heading: "Checklist multiloja",
        body: [],
        bullets: [
          "identificador do produto conferido",
          "frete somado",
          "prazo comparado",
          "garantia lida",
          "vendedor verificado",
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
    depth: "standard",
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
      {
        heading: "Falsa promoção não é sempre fraude",
        body: [
          "Falsa promoção não precisa ser fraude; muitas vezes é apenas uma comunicação que enfatiza o desconto sem provar economia real para quem está comprando.",
          "Cinco hábitos reduzem o risco de cair nela: desconfiar de preço riscado isolado sem outra referência, buscar o preço recente do mesmo produto em outro canal, comparar o preço final em mais de uma loja, observar mudanças de kit, quantidade ou versão entre o anúncio e o que você pesquisou, e evitar decisão baseada só na urgência visual da página.",
        ],
        bullets: [
          "desconfiar de preço riscado isolado",
          "buscar referência recente do mesmo produto",
          "comparar preço final em mais de uma loja",
          "observar mudanças de kit, quantidade ou versão",
          "evitar decisão baseada apenas em urgência visual",
        ],
      },
      {
        heading: "O rótulo promocional não prova nada sozinho",
        body: [
          "Um produto pode aparecer com grande percentual de desconto e ainda assim custar o mesmo que custou em dias comuns. Sem uma referência de comparação, a etiqueta promocional é apenas uma afirmação comercial — não um fato.",
        ],
      },
      {
        heading: "O que alimenta a decisão por impulso",
        body: [
          "Clicar por medo de perder a oferta, comprar um produto parecido achando que é o mesmo, ignorar a condição de pagamento no cálculo final, e assumir que toda promoção de data especial é automaticamente boa — esses quatro hábitos abrem espaço para arrependimento.",
        ],
        bullets: [
          "clicar por medo de perder",
          "comprar produto parecido achando que é igual",
          "ignorar condição de pagamento",
          "assumir que toda promoção de data especial é boa",
        ],
      },
      {
        heading: "Sinais de que a promoção é legítima",
        body: [
          "O histórico sustenta a queda, a oferta é clara sobre qual produto está sendo vendido, o custo final é competitivo depois de somar tudo, e a compra já fazia sentido para você antes mesmo do anúncio aparecer.",
        ],
        bullets: [
          "o histórico sustenta a queda",
          "a oferta é clara sobre o produto",
          "o custo final é competitivo",
          "a compra já fazia sentido antes do anúncio",
        ],
      },
      {
        heading: "Onde a análise fica limitada",
        body: [
          "Nem toda loja exibe histórico público de preços, variações pequenas podem ser apenas normais do varejo, e sem dados suficientes a decisão precisa ser cautelosa em vez de otimista.",
        ],
        bullets: [
          "nem toda loja exibe histórico público",
          "variações pequenas podem ser normais",
          "sem dados suficientes, a decisão deve ser cautelosa",
        ],
      },
      {
        heading: "Um exemplo real de falsa urgência",
        body: [
          "Um contador regressivo zera e reaparece dias depois, na mesma página, com o mesmo preço. Isso não significa necessariamente má-fé — pode ser apenas um recurso de design reutilizado entre campanhas —, mas mostra por que urgência visual sozinha nunca deveria ser a base de uma decisão de compra. O histórico de preço é uma referência mais estável do que qualquer relógio na tela.",
        ],
      },
      {
        heading: "Checklist de defesa",
        body: [],
        bullets: [
          "preço anterior questionado",
          "histórico visto",
          "produto exato confirmado",
          "pressão de urgência ignorada",
          "compra validada pelo uso real",
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
    depth: "standard",
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
      {
        heading: "De onde vem o falso desconto",
        body: [
          "O falso desconto aparece quando a referência usada para a comparação não representa o preço pelo qual o produto costuma realmente ser vendido no dia a dia.",
          "Cinco verificações separam desconto real de maquiagem de preço: usar o preço médio recente como contraponto ao preço riscado, calcular a diferença em valor nominal e em percentual, verificar se o produto mudou de versão ou quantidade entre uma consulta e outra, comparar o preço final com frete incluído, e tratar histórico curto como um sinal fraco, não conclusivo.",
        ],
        bullets: [
          "usar preço médio recente como contraponto ao preço riscado",
          "calcular diferença nominal e percentual",
          "verificar se o produto mudou de versão ou quantidade",
          "comparar preço final com frete",
          "tratar histórico curto como sinal fraco",
        ],
      },
      {
        heading: "Quando a economia anunciada não é real",
        body: [
          "Se o preço anterior informado é muito alto, mas o histórico mostra vendas frequentes por valor próximo ao atual, a economia real pode ser pequena. A calculadora do PreçoCaindo ajuda a separar queda nominal de oportunidade concreta.",
        ],
      },
      {
        heading: "Onde a confiança quebra",
        body: [
          "Acreditar em desconto sem nenhuma base de comparação, comparar anúncios de produtos diferentes entre si, ignorar cupons condicionais que mudam o preço final, e concluir com poucos dados disponíveis — esses quatro pontos derrubam a confiabilidade de qualquer cálculo de desconto.",
        ],
        bullets: [
          "acreditar em desconto sem base",
          "comparar anúncios de produtos diferentes",
          "ignorar cupons condicionais",
          "concluir com poucos dados",
        ],
      },
      {
        heading: "Quando o desconto calculado é confiável",
        body: [
          "É confiável quando a referência usada é recente e verificável, o preço atual realmente se distancia da média observada, as condições comerciais comparadas são equivalentes, e o produto atende à necessidade que motivou a busca.",
        ],
        bullets: [
          "a referência é recente e verificável",
          "o preço atual realmente se distancia da média",
          "as condições comerciais são equivalentes",
          "o produto atende à necessidade",
        ],
      },
      {
        heading: "O que o cálculo não cobre",
        body: [
          "Referências externas podem estar desatualizadas, cupons personalizados mudam a conta de pessoa para pessoa, e a análise de preço não garante que o estoque vai durar até você decidir comprar.",
        ],
        bullets: [
          "referências externas podem estar desatualizadas",
          "cupons personalizados mudam a conta",
          "a análise não garante estoque",
        ],
      },
      {
        heading: "Um exemplo de cálculo simples",
        body: [
          "Se um produto sai de R$ 800 (preço anterior informado) para R$ 720 hoje, a calculadora mostra 10% de desconto e R$ 80 de economia nominal. Se o histórico do PreçoCaindo mostra que o mesmo produto já foi vendido por R$ 710 há duas semanas, a economia real em relação ao comportamento normal do produto é bem menor do que os 10% anunciados sugerem.",
        ],
      },
      {
        heading: "Checklist de cálculo",
        body: [],
        bullets: [
          "preço anterior informado",
          "preço atual conferido",
          "percentual calculado",
          "histórico comparado",
          "frete e prazo incluídos",
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
    depth: "standard",
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
      {
        heading: "Um recorde não é uma promessa",
        body: [
          "Menor preço histórico é uma referência útil, mas precisa ser interpretado junto com disponibilidade, janela observada e condição de compra — nunca isolado, como se fosse a verdade absoluta sobre o produto.",
          "Cinco leituras evitam confundir recorde com expectativa: ver se o menor preço foi observado uma única vez ou de forma repetida, considerar por quanto tempo o produto foi acompanhado, comparar o menor histórico com a média recente, checar se o vendedor, o frete ou a versão mudaram desde então, e decidir se esperar pelo menor valor é realista para o seu prazo.",
        ],
        bullets: [
          "ver se o menor preço foi observado uma vez ou repetidas vezes",
          "considerar por quanto tempo o produto foi acompanhado",
          "comparar menor histórico com preço médio recente",
          "checar se o vendedor, o frete ou a versão mudaram",
          "decidir se esperar pelo menor valor é realista para você",
        ],
      },
      {
        heading: "Um recorde de poucas horas não é meta prática",
        body: [
          "Um menor preço visto por poucas horas pode não ser uma meta prática de comparação. Um preço um pouco acima dele, mas abaixo da média e disponível em boas condições, costuma ser uma decisão melhor no dia a dia.",
        ],
      },
      {
        heading: "O que distorce essa leitura",
        body: [
          "Transformar o recorde em obrigação de compra, desconsiderar prazo e disponibilidade de estoque, comparar gerações diferentes do mesmo produto, e esperar sem nenhum limite de tempo definido — esses quatro hábitos tiram o menor preço histórico do seu papel de referência e o transformam em armadilha.",
        ],
        bullets: [
          "transformar recorde em obrigação",
          "desconsiderar prazo e estoque",
          "comparar gerações diferentes",
          "esperar sem limite definido",
        ],
      },
      {
        heading: "Quando vale a pena mirar no recorde",
        body: [
          "Vale quando a compra é flexível quanto ao prazo, existe histórico suficiente para embasar a expectativa, o preço atual está distante da média observada, e a diferença numérica compensa o tempo de espera.",
        ],
        bullets: [
          "a compra é flexível",
          "há histórico suficiente",
          "o preço atual está distante da média",
          "a diferença compensa esperar",
        ],
      },
      {
        heading: "O que o número não conta",
        body: [
          "O menor preço já visto pode simplesmente não voltar, o histórico depende inteiramente da coleta disponível para aquele produto, e o número em si não mede qualidade nem adequação ao seu uso.",
        ],
        bullets: [
          "o menor preço pode não voltar",
          "histórico depende da coleta disponível",
          "o número não mede qualidade ou adequação",
        ],
      },
      {
        heading: "Perguntas frequentes sobre menor preço histórico",
        body: [
          "O PreçoCaindo garante que o produto vai voltar ao menor preço? Não, e nenhum serviço sério deveria prometer isso — o menor preço histórico é uma referência do que já aconteceu, não uma previsão do que vai acontecer.",
          "Por que às vezes um produto novo não mostra menor preço histórico? Porque ele acabou de começar a ser acompanhado — sem janela de observação, não existe base para calcular mínimo, média ou posição histórica com confiança.",
        ],
      },
      {
        heading: "Checklist de interpretação",
        body: [],
        bullets: [
          "janela de histórico conferida",
          "frequência do menor preço analisada",
          "média recente comparada",
          "condição de compra validada",
          "limite de espera definido",
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
    depth: "standard",
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
      {
        heading: "A embalagem grande só vence sob condição",
        body: [
          "A embalagem maior nem sempre é melhor; ela só vence quando o preço por medida cai de fato e quando você vai usar o volume inteiro sem perda no caminho.",
          "Cinco cuidados protegem essa conta: converter todas as embalagens para a mesma base de comparação, considerar validade, armazenamento e frequência real de consumo, diferenciar refil, concentrado, unidade e kit fechado, verificar se a embalagem grande muda a praticidade do uso diário, e calcular o desembolso de hoje contra a economia esperada ao longo do uso.",
        ],
        bullets: [
          "converter todas as embalagens para a mesma base",
          "considerar validade, armazenamento e frequência de consumo",
          "diferenciar refil, concentrado, unidade e kit",
          "verificar se a embalagem grande muda praticidade",
          "calcular desembolso hoje contra economia ao longo do uso",
        ],
      },
      {
        heading: "Economia ou desperdício, dependendo do produto",
        body: [
          "Comprar um pacote grande de item recorrente pode economizar de verdade. Comprar volume grande de algo que vence, ocupa espaço ou que você ainda está testando pode transformar o desconto em desperdício puro.",
        ],
      },
      {
        heading: "Onde a economia se perde",
        body: [
          "Comprar tamanho grande de um produto ainda desconhecido, ignorar a validade impressa na embalagem, comparar unidade avulsa com kit fechado como se fossem a mesma coisa, e confundir quantidade total com rendimento real de uso — esses quatro pontos costumam anular a vantagem do preço por unidade.",
        ],
        bullets: [
          "comprar tamanho grande para produto desconhecido",
          "ignorar validade",
          "comparar unidade com kit fechado",
          "confundir quantidade com rendimento",
        ],
      },
      {
        heading: "Quando o pacote grande compensa mesmo",
        body: [
          "Compensa quando o uso é recorrente e previsível, o custo por unidade comparável realmente ficou menor, não existe risco relevante de desperdício, e o estoque cabe no espaço disponível em casa sem aperto.",
        ],
        bullets: [
          "o uso é recorrente",
          "a unidade comparável ficou menor",
          "não há risco relevante de desperdício",
          "o estoque cabe no espaço disponível",
        ],
      },
      {
        heading: "Limites dessa comparação",
        body: [
          "O rendimento pode variar de acordo com o uso de cada pessoa, a preferência pessoal altera o valor percebido de uma marca, e kits promocionais podem incluir itens de utilidade bem desigual entre si.",
        ],
        bullets: [
          "rendimento pode variar por uso",
          "preferência pessoal altera valor percebido",
          "kits podem ter itens de utilidade desigual",
        ],
      },
      {
        heading: "Refil, concentrado e kit: três armadilhas parecidas",
        body: [
          "Refil costuma custar menos que a embalagem completa, mas só compensa se você já tem o recipiente original — comparar preço de refil com preço de produto completo é comparar coisas diferentes. Produto concentrado (detergente, amaciante) exige olhar o rendimento por dose, não o volume do frasco: um frasco menor concentrado pode render mais que um frasco maior diluído.",
          "Kit promocional junta itens de utilidade desigual — às vezes um item extra que você não usaria sozinho infla o valor percebido sem representar economia real. Vale separar mentalmente o preço de cada item do kit antes de decidir se o conjunto realmente compensa.",
        ],
      },
      {
        heading: "Checklist de embalagem",
        body: [],
        bullets: [
          "medidas normalizadas",
          "validade lida",
          "consumo mensal estimado",
          "espaço considerado",
          "economia por unidade calculada",
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
    depth: "deep",
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
      {
        heading: "Formato do cesto e potência",
        body: [
          "Existem basicamente dois formatos: cesto tipo gaveta (mais comum, prático para porções do dia a dia) e formato forno com porta frontal (geralmente maior, útil para assar peças inteiras ou usar acessórios como forma e grelha). O formato certo depende menos do preço e mais do que você pretende preparar com frequência.",
          "Potência não é sinônimo de qualidade — é sinônimo de velocidade de aquecimento e, em geral, de consumo de energia mais alto durante o uso. Uma air fryer de 1400W e outra de 2000W podem entregar resultado parecido; a diferença aparece no tempo de preparo e na conta de luz, não necessariamente no sabor final.",
        ],
      },
      {
        heading: "Limpeza, revestimento e peças de reposição",
        body: [
          "Cesto removível e antiaderente facilita a limpeza diária — pergunte se as peças vão à lava-louças antes de decidir. Revestimento antiaderente de baixa qualidade descasca com o tempo; isso não é algo que uma foto de anúncio mostra, então vale olhar avaliações específicas sobre durabilidade do revestimento antes de comparar só o preço.",
          "Peças de reposição (cesto, resistência, cabo) precisam existir no mercado nacional. Marcas com pouca representação no Brasil podem ter aparelho barato, mas sem assistência técnica ou peça de reposição acessível quando algo quebra depois da garantia.",
        ],
      },
      {
        heading: "Voltagem e garantia",
        body: [
          "Confirme a voltagem (127V ou 220V) antes de comprar — é um erro comum e caro, já que o aparelho não funciona ou queima na voltagem errada. Quanto à garantia, compare o prazo legal mínimo com o que a marca oferece: garantia estendida real (com nota fiscal e assistência local) pesa mais do que alguns reais de desconto em um modelo sem suporte no Brasil.",
        ],
      },
      {
        heading: "Perfil de uso decide o modelo certo",
        body: [
          "Uma pessoa que prepara porções pequenas pode preferir modelo compacto e fácil de lavar. Uma família pode valorizar cesto maior, mas só se a bancada comportar o aparelho e se a limpeza continuar prática no dia a dia. Comprar a maior capacidade sem medir o espaço disponível, ignorar a voltagem, escolher só pela potência sem olhar o uso real, e desconsiderar a limpeza do cesto e do revestimento são os quatro erros mais comuns nessa compra.",
        ],
        bullets: [
          "comprar a maior capacidade sem medir espaço",
          "ignorar voltagem",
          "escolher só pela potência sem olhar uso real",
          "desconsiderar limpeza do cesto e do revestimento",
        ],
      },
      {
        heading: "Quando o custo-benefício fecha",
        body: [
          "Fecha quando a capacidade combina com a rotina de quem vai usar, o aparelho cabe fisicamente onde vai ficar, o cesto é prático de limpar no dia a dia, existe garantia e peça de reposição compatíveis com o risco que você aceita correr, e o preço faz sentido para a frequência real de uso — não para o uso imaginado no dia da compra.",
        ],
        bullets: [
          "a capacidade combina com a rotina",
          "o aparelho cabe onde será usado",
          "o cesto é prático para limpar",
          "há garantia e peça compatível com o risco aceito",
          "o preço faz sentido para a frequência de uso",
        ],
      },
      {
        heading: "O que não avaliamos sem teste",
        body: [
          "Não avaliamos desempenho culinário específico sem um teste próprio, a capacidade nominal anunciada pode não representar uma porção confortável na prática, e o consumo real de energia depende do tempo e da frequência de uso de cada casa.",
        ],
        bullets: [
          "não avaliamos desempenho culinário específico sem teste próprio",
          "capacidade nominal pode não representar porção confortável",
          "consumo real depende do tempo e da frequência de uso",
        ],
      },
      {
        heading: "Perguntas frequentes sobre air fryer",
        body: [
          "Air fryer maior sempre é melhor escolha? Não — uma air fryer de 8 litros para uma pessoa que mora sozinha costuma ocupar espaço demais na bancada e ainda gastar mais energia para aquecer um volume de ar que não será usado por inteiro na maioria dos preparos.",
          "Air fryer substitui forno? Substitui parcialmente: é mais rápida para porções do dia a dia, mas um forno tradicional ainda leva vantagem em receitas de grande volume ou que exigem mais de um nível de cocção ao mesmo tempo.",
          "Todas as marcas têm peça de reposição fácil de achar? Não — marcas com pouca presença no varejo nacional podem ter cesto ou resistência difíceis de encontrar depois do primeiro ano; isso vale mais checar antes de comprar do que depois que a peça original quebra.",
        ],
      },
      {
        heading: "Checklist da air fryer",
        body: [],
        bullets: [
          "capacidade pensada por porção",
          "bancada medida",
          "cesto e revestimento avaliados",
          "voltagem conferida",
          "garantia verificada",
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
    depth: "deep",
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
      {
        heading: "Geração, armazenamento e RAM",
        body: [
          "Um mesmo nome comercial pode cobrir mais de uma geração ou variante de chip. Antes de comparar preço, confira o código exato do modelo — a diferença de uma letra costuma indicar processador, câmera ou conectividade diferentes, mesmo com visual idêntico.",
          "Armazenamento é a primeira coisa a ficar pequena no uso real: fotos, vídeos e apps crescem mais rápido do que se imagina. RAM insuficiente aparece como lentidão para trocar de aplicativo, não como um número visível na hora da compra — por isso vale comparar com o uso pretendido, não com o menor valor anunciado.",
        ],
      },
      {
        heading: "Atualizações, bateria e câmera",
        body: [
          "Política de atualização de sistema varia por fabricante e por linha — sem declarar prazo específico sem fonte oficial, o critério prático é: quanto mais recente a geração, mais tempo de atualização ainda restante. Um aparelho já sem atualização no lançamento tende a ficar desatualizado (e mais vulnerável) mais rápido.",
          "Bateria se degrada com o tempo de uso, não só com a idade do aparelho — ciclos de carga rápida frequente aceleram esse desgaste. Câmera com muitos megapixels no anúncio não é garantia de foto melhor em ambiente com pouca luz; isso depende de sensor, processamento e software, que a ficha técnica de vitrine raramente detalha.",
        ],
      },
      {
        heading: "Conectividade, garantia e origem",
        body: [
          "Confirme se o aparelho tem as bandas de rede usadas no Brasil e se é homologado pela Anatel — modelos importados sem homologação podem ter conectividade limitada ou nenhuma assistência técnica local em caso de defeito.",
          "Garantia de loja nacional costuma ser mais simples de acionar do que garantia internacional. Aparelho importado pode custar menos na etiqueta e mais no risco, especialmente se a tela ou a bateria precisarem de troca fora do prazo de garantia internacional.",
        ],
      },
      {
        heading: "Vida útil e custo por ano",
        body: [
          "Comprar só por contagem de megapixels da câmera, ignorar o armazenamento disponível, misturar aparelho importado e nacional sem avaliar a garantia, e comprar geração antiga sem entender os compromissos que isso traz (menos atualização, peças mais escassas) são os quatro erros mais comuns nessa compra.",
        ],
        bullets: [
          "comprar só por megapixels",
          "ignorar armazenamento",
          "misturar importado e nacional sem avaliar garantia",
          "comprar geração antiga sem entender compromissos",
        ],
      },
      {
        heading: "Quando o celular vale o preço pedido",
        body: [
          "Vale quando o aparelho atende ao uso por mais de um ciclo curto de troca, existe garantia compatível com o risco assumido, armazenamento e bateria são suficientes para a rotina, o preço por ano de uso fica razoável frente às alternativas, e a conectividade atende à operadora e aos acessórios que você já tem.",
        ],
        bullets: [
          "o aparelho atende ao uso por mais de um ciclo curto",
          "há garantia compatível",
          "armazenamento e bateria são suficientes",
          "o preço por ano de uso fica razoável",
          "a conectividade atende operadora e acessórios",
        ],
      },
      {
        heading: "O que não afirmamos sem teste",
        body: [
          "Não fazemos benchmark técnico próprio sem declarar isso claramente, a autonomia real da bateria varia conforme o uso de cada pessoa, e a qualidade de câmera depende muito do cenário de fotografia — algo que uma ficha técnica não captura sozinha.",
        ],
        bullets: [
          "não fazemos benchmark próprio sem declarar",
          "autonomia varia conforme uso",
          "qualidade de câmera depende do cenário",
        ],
      },
      {
        heading: "Perguntas frequentes sobre celular",
        body: [
          "Celular seminovo vale a pena? Pode valer se vier com garantia da loja, verificação de bateria e nota fiscal — sem isso, o desconto no preço pode não compensar o risco de um defeito não coberto por nenhuma garantia.",
          "Mais RAM sempre significa celular mais rápido? Ajuda a manter mais aplicativos abertos ao mesmo tempo sem travar, mas processador e otimização do sistema pesam tanto quanto a quantidade de memória anunciada na ficha técnica.",
          "Vale importar celular para economizar? Só quando homologação, banda de rede e garantia local estão resolvidas — caso contrário, a economia na etiqueta pode virar um aparelho sem assistência técnica no Brasil.",
          "Preço mais alto sempre significa aparelho melhor? Não de forma automática — parte do preço de modelos topo de linha paga por materiais premium e marca, não necessariamente por ganho equivalente em uso diário para quem não explora recursos avançados de câmera ou processamento.",
        ],
      },
      {
        heading: "Checklist do celular",
        body: [],
        bullets: [
          "geração identificada",
          "armazenamento escolhido",
          "garantia conferida",
          "bateria considerada",
          "custo por ano estimado",
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
    depth: "deep",
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
      {
        heading: "Navegação, mapeamento e sensores",
        body: [
          "Modelos de entrada costumam navegar por padrão aleatório, sem mapa da casa — funcionam, mas repetem áreas e demoram mais para cobrir o mesmo espaço. Modelos com mapeamento a laser ou por câmera guardam a planta da casa, permitem limpar cômodo específico e costumam evitar obstáculos com mais precisão.",
          "Sensores de queda, de obstáculo e de sujeira variam bastante entre faixas de preço. Em casas com desnível, degrau ou muito objeto no chão, sensores melhores reduzem trava e evitam que o aparelho fique preso repetidamente no mesmo lugar.",
        ],
      },
      {
        heading: "Tapetes, pets e obstáculos do dia a dia",
        body: [
          "Tapetes de pelo alto costumam confundir a navegação de modelos mais simples e podem prender a escova. Fios soltos no chão são a causa mais comum de robô travado — vale organizar o ambiente antes de esperar desempenho perfeito de qualquer modelo.",
          "Em casa com pets, pelo entope escova e filtro mais rápido, o que aumenta a frequência de manutenção. Isso não é defeito do aparelho — é característica do ambiente, e vale considerar antes de comparar só o preço de compra.",
        ],
      },
      {
        heading: "Filtros, peças e manutenção recorrente",
        body: [
          "Escovas, filtros e pano de limpeza têm troca periódica — isso é custo recorrente, não apenas investimento inicial. Se as peças são caras ou difíceis de encontrar no Brasil, o preço inicial menor pode perder força depois de alguns meses de uso.",
        ],
      },
      {
        heading: "Autonomia e tamanho da casa",
        body: [
          "Autonomia de bateria precisa cobrir a área real da casa, não a área anunciada em condições ideais. Casas grandes ou com muitos cômodos podem exigir que o aparelho volte à base para recarregar e retome de onde parou — recurso que nem todo modelo de entrada oferece.",
          "Comprar sem medir a altura livre embaixo dos móveis, ignorar fios e obstáculos do ambiente, desconsiderar a manutenção de escovas e filtros, e esperar resultado perfeito em um ambiente pouco preparado são os quatro erros mais comuns nessa compra.",
        ],
        bullets: [
          "comprar sem medir altura dos móveis",
          "ignorar fios e obstáculos",
          "desconsiderar manutenção de escovas e filtros",
          "esperar resultado perfeito em ambiente pouco preparado",
        ],
      },
      {
        heading: "Quando o robô aspirador compensa",
        body: [
          "Compensa quando o mapa da casa combina com o tipo de navegação do modelo escolhido, a autonomia cobre a área desejada sem múltiplas recargas, as peças de manutenção são fáceis de encontrar, existe rotina para esvaziar e limpar o aparelho, e o preço compensa a redução real de trabalho manual.",
        ],
        bullets: [
          "o mapa da casa combina com o tipo de navegação",
          "a autonomia cobre a área desejada",
          "peças de manutenção são encontráveis",
          "há rotina para esvaziar e limpar o aparelho",
          "o preço compensa a redução de trabalho manual",
        ],
      },
      {
        heading: "O que varia caso a caso",
        body: [
          "O resultado varia conforme o tipo de piso e a organização do ambiente, pets aumentam a exigência de manutenção, e o aparelho não substitui limpeza pesada em todos os cenários — ele complementa, não substitui integralmente.",
        ],
        bullets: [
          "resultado varia conforme piso e organização",
          "pets aumentam exigência de manutenção",
          "não substitui limpeza pesada em todos os cenários",
        ],
      },
      {
        heading: "Perguntas frequentes sobre robô aspirador",
        body: [
          "Robô aspirador substitui aspirador comum? Na maioria das casas, reduz a frequência de uso do aspirador manual, mas não elimina limpeza pesada em cantos, estofados ou depois de eventos com muita sujeira concentrada.",
          "Vale a pena em apartamento pequeno? Costuma valer ainda mais nesse caso, já que a área menor reduz a exigência de autonomia e mapeamento, permitindo que até modelos de entrada cubram o espaço em uma carga.",
          "Preciso trocar a bateria em algum momento? Sim — bateria de robô se degrada com o tempo de uso, como qualquer bateria recarregável, e a disponibilidade dessa peça de reposição no Brasil deveria entrar na comparação antes da compra, não depois.",
          "Modelo mais caro limpa melhor? Nem sempre — parte do preço mais alto paga por conveniência (esvaziamento automático, app mais completo, mapeamento multiandar), não necessariamente por sucção maior. Vale separar o que é potência de limpeza do que é conveniência de uso antes de decidir se compensa o valor extra.",
          "Preciso limpar o robô depois de cada uso? Não necessariamente todo dia, mas esvaziar o reservatório e checar a escova com frequência evita perda de desempenho gradual — um robô entupido rende cada vez menos, mesmo sem apresentar erro visível no aplicativo.",
        ],
      },
      {
        heading: "Checklist do robô aspirador",
        body: [],
        bullets: [
          "área da casa estimada",
          "obstáculos mapeados",
          "tapetes avaliados",
          "peças verificadas",
          "manutenção aceita",
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
    depth: "deep",
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
      {
        heading: "Tamanho, distância e resolução",
        body: [
          "TV combina tamanho, distância, painel, brilho, reflexos, HDMI, taxa de atualização, sistema, jogos e geração. Preço baixo sozinho pode esconder tecnologia inadequada para o ambiente onde a TV vai ficar.",
          "A regra prática é relacionar polegadas à distância do sofá: tela grande demais para o ambiente cansa a vista sem entregar benefício real, e tela pequena demais desperdiça a resolução 4K que você pagou. Resolução só compensa quando o conteúdo assistido também é nessa qualidade — streaming em definição menor não aproveita o painel mais caro.",
        ],
      },
      {
        heading: "Painel, brilho e reflexos do ambiente",
        body: [
          "Tipo de painel muda contraste e ângulo de visão — isso importa mais em sala com vários lugares para sentar. Em sala clara, brilho alto e bom tratamento antirreflexo pesam mais na experiência do que ganhar algumas polegadas de tela.",
        ],
      },
      {
        heading: "HDMI, taxa de atualização e jogos",
        body: [
          "Conte quantos HDMIs você realmente precisa: console, receptor, soundbar e computador somam rápido, e TV com poucas entradas obriga a trocar cabo o tempo todo. Para jogos, taxa de atualização mais alta e HDMI com suporte a essa taxa fazem diferença perceptível — recurso que nem toda TV barata do mesmo tamanho oferece.",
        ],
      },
      {
        heading: "Sistema, geração e o que evitar",
        body: [
          "Sistema operacional lento ou desatualizado compromete o uso diário mesmo em uma TV com bom painel — vale considerar como parte do custo-benefício, não como detalhe secundário. Geração e linha do modelo mudam o valor real do preço anunciado: comprar a maior tela possível sem medir a distância do sofá, ignorar o reflexo da sala, comparar linhas de anos diferentes sem perceber, e esquecer HDMI suficiente para console, soundbar e receptor são os quatro erros mais comuns.",
        ],
        bullets: [
          "comprar maior tela possível sem medir distância",
          "ignorar reflexo da sala",
          "comparar linhas de anos diferentes sem perceber",
          "esquecer HDMI para console, soundbar e receptor",
        ],
      },
      {
        heading: "Quando a TV compensa o preço pedido",
        body: [
          "Compensa quando tamanho e distância combinam de fato, o painel atende às condições de luz do ambiente, as entradas cobrem os aparelhos que você já tem, o sistema atende aos aplicativos que você usa, e o preço condiz com a tecnologia e a geração do modelo.",
        ],
        bullets: [
          "tamanho e distância combinam",
          "painel atende ao ambiente",
          "entradas cobrem seus aparelhos",
          "sistema atende aos aplicativos usados",
          "preço condiz com tecnologia e geração",
        ],
      },
      {
        heading: "O que não cravamos sem ver a TV ligada",
        body: [
          "Preferência de imagem é subjetiva de pessoa para pessoa, não declaramos medição técnica de brilho ou contraste sem teste próprio, e nomes comerciais parecidos podem confundir linhas de anos e tecnologias diferentes.",
        ],
        bullets: [
          "preferência de imagem é subjetiva",
          "não declaramos medição técnica sem teste",
          "nomes comerciais podem confundir linhas diferentes",
        ],
      },
      {
        heading: "Preço vs. tecnologia: onde o dinheiro realmente vai",
        body: [
          "Duas TVs do mesmo tamanho podem ter preços bem diferentes por causa do painel, não da marca estampada na caixa. Tecnologias de painel com melhor contraste e preto mais profundo custam mais para fabricar, e isso aparece direto no preço final — mesmo em modelos com especificação de tamanho e resolução idênticas no papel.",
          "Um erro comum é comparar só a resolução anunciada. Duas TVs 4K podem processar imagem de forma muito diferente: uma com processador mais simples, outra com upscaling melhor para conteúdo em qualidade inferior — o que se percebe assistindo TV aberta ou streaming em conexão mais lenta, não só em filme 4K nativo.",
        ],
      },
      {
        heading: "Perguntas frequentes sobre TV",
        body: [
          "TV mais cara sempre compensa? Não necessariamente — se o ambiente é escuro e o uso é basicamente streaming, um modelo intermediário com bom processamento pode entregar experiência muito próxima de um modelo premium, sem os recursos extras que você não vai usar.",
          "Vale comprar TV de geração anterior em promoção? Pode valer, desde que o sistema operacional ainda receba atualização e as entradas atendam ao que você precisa hoje — o risco é a TV ficar tecnicamente datada mais rápido que uma geração atual.",
          "Taxa de atualização alta importa fora de jogos? Menos do que o marketing sugere — para filme e série, o ganho é pouco perceptível; o critério pesa mais para quem realmente joga videogame na TV com regularidade.",
        ],
      },
      {
        heading: "Checklist da TV",
        body: [],
        bullets: [
          "distância medida",
          "ambiente claro ou escuro avaliado",
          "HDMIs contados",
          "uso para jogos definido",
          "geração identificada",
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
    depth: "standard",
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
      {
        heading: "Consumo, validade e estoque mínimo",
        body: [
          "Compra recorrente melhora quando você conhece consumo, validade, estoque mínimo e preço por unidade antes da urgência aparecer — não depois, quando o produto já acabou e sobra menos tempo para comparar.",
          "Cinco hábitos sustentam essa economia: estimar o consumo mensal real (não o imaginado), calcular o preço por unidade de forma comparável entre marcas, definir um estoque mínimo para nunca comprar em emergência, respeitar validade, espaço e orçamento parado no estoque, e usar alerta de preço para comprar no ciclo certo — não para acumular sem limite.",
        ],
        bullets: [
          "estimar consumo mensal real",
          "calcular preço por unidade comparável",
          "definir estoque mínimo para não comprar em emergência",
          "respeitar validade, espaço e orçamento parado",
          "usar alerta para comprar no ciclo certo, não para acumular sem limite",
        ],
      },
      {
        heading: "O risco de estocar demais",
        body: [
          "Se um produto acaba todo mês, acompanhar o preço por unidade ajuda a comprar antes da pressa. Mas estocar demais algo com validade curta pode anular a economia inteira e ainda ocupar dinheiro que faria falta em outra compra.",
        ],
      },
      {
        heading: "O que anula a economia",
        body: [
          "Comprar volume grande sem consumo previsível, ignorar a validade impressa na embalagem, confundir promoção com autorização para estoque exagerado, e comprar em emergência sem comparar alternativas — esses quatro hábitos costumam anular qualquer vantagem de preço conquistada antes.",
        ],
        bullets: [
          "comprar volume grande sem consumo previsível",
          "ignorar validade",
          "confundir promoção com autorização para estoque exagerado",
          "comprar emergência sem comparar alternativas",
        ],
      },
      {
        heading: "Quando o estoque planejado compensa",
        body: [
          "Compensa quando o consumo é estável mês a mês, a economia por unidade é clara na conta, existe espaço real para armazenar, e o estoque comprado não prende dinheiro que faria falta para outra necessidade.",
        ],
        bullets: [
          "o consumo é estável",
          "a economia por unidade é clara",
          "há espaço para armazenar",
          "o estoque não prende dinheiro essencial",
        ],
      },
      {
        heading: "O que muda de casa para casa",
        body: [
          "O consumo familiar muda ao longo do tempo, validade e forma de armazenamento variam por tipo de produto, e preço por unidade não mede preferência — ele só evita pagar mais por engano.",
        ],
        bullets: [
          "consumo familiar muda",
          "validade e armazenamento variam por produto",
          "preço por unidade não mede preferência",
        ],
      },
      {
        heading: "Como calcular seu consumo mensal na prática",
        body: [
          "Anote a data em que um produto recorrente acabou por duas ou três vezes seguidas. A diferença de dias entre as compras dá uma estimativa de consumo bem mais confiável do que tentar adivinhar de cabeça — a maioria das pessoas subestima ou superestima o próprio ritmo de uso sem perceber.",
          "Com essa estimativa, o estoque mínimo vira uma conta simples: se você usa uma unidade a cada 20 dias e a entrega demora até 5 dias, manter uma unidade reserva já cobre o intervalo entre pedir e receber, sem precisar guardar mais do que isso.",
        ],
      },
      {
        heading: "Perguntas frequentes sobre compra recorrente",
        body: [
          "Assinatura recorrente de loja sempre economiza? Só quando o desconto do plano é maior do que a variação de preço que o produto já tem fora dele — vale comparar o preço da assinatura com o preço avulso praticado ao longo de alguns meses antes de assinar.",
          "Vale comprar em quantidade só porque está mais barato agora? Só se o consumo já é previsível e o produto não perde qualidade guardado — comprar por impulso um volume grande de algo que você usa pouco costuma custar mais no fim do que parece na hora.",
        ],
      },
      {
        heading: "Checklist de compra recorrente",
        body: [],
        bullets: [
          "consumo mensal anotado",
          "estoque mínimo definido",
          "validade conferida",
          "preço por unidade calculado",
          "compra limitada ao ciclo necessário",
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
    depth: "standard",
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
      {
        heading: "Resumo, não ordem de compra",
        body: [
          "Score é resumo, não ordem de compra. Ele organiza sinais de preço para reduzir ruído na decisão, mas a decisão final ainda precisa considerar pessoa, orçamento e uso — coisas que um número sozinho não capta.",
          "Cinco hábitos evitam usar o Score da forma errada: ler o número sempre junto com histórico e evidências, verificar se há dados suficientes para dar confiança ao resultado, separar oportunidade objetiva de desejo pessoal pelo produto, usar score baixo como convite para esperar ou investigar mais, e usar score alto como prioridade de análise — nunca como obrigação automática de compra.",
        ],
        bullets: [
          "ler o score junto com histórico e evidências",
          "verificar se há dados suficientes para confiança",
          "separar oportunidade objetiva de desejo pessoal",
          "usar score baixo como convite para esperar ou investigar",
          "usar score alto como prioridade de análise, não obrigação de compra",
        ],
      },
      {
        heading: "O número ordena atenção, não decide por você",
        body: [
          "Um produto com score alto pode não servir para você se a versão for a errada. Um produto com score médio pode valer se resolve uma urgência real. O número ajuda a ordenar atenção entre várias opções, mas não compra no seu lugar.",
        ],
      },
      {
        heading: "Como o Score não deve ser lido",
        body: [
          "Comprar automaticamente só porque o score está alto, ignorar o orçamento disponível, comparar scores de categorias completamente diferentes entre si, e esquecer frete, prazo e versão do produto — esses quatro hábitos transformam uma ferramenta útil em decisão apressada.",
        ],
        bullets: [
          "comprar automaticamente por score alto",
          "ignorar orçamento",
          "comparar scores de categorias muito diferentes",
          "esquecer frete, prazo e versão",
        ],
      },
      {
        heading: "Quando o Score é mais confiável",
        body: [
          "É mais confiável quando há histórico suficiente por trás do número, a versão do produto está correta, a compra já fazia sentido por conta própria, e o score apenas confirma uma vantagem de preço que já existia.",
        ],
        bullets: [
          "há histórico suficiente",
          "a versão está correta",
          "a compra já fazia sentido",
          "o score confirma uma vantagem de preço",
        ],
      },
      {
        heading: "O que o Score não mede",
        body: [
          "O Score não mede gosto pessoal, dados incompletos reduzem a confiança do resultado, e o preço muda com frequência — o que significa que o score precisa ser recalculado, não tratado como um número fixo.",
        ],
        bullets: [
          "score não mede gosto pessoal",
          "dados incompletos reduzem confiança",
          "preço muda e o score deve ser recalculado",
        ],
      },
      {
        heading: "Um exemplo de leitura do Score",
        body: [
          "Um produto com score 82 e histórico de 60 dias é um sinal forte: dado suficiente, preço abaixo da média, próximo do menor já observado. Um produto com score 82 mas apenas 4 dias de histórico merece mais cautela — o número é o mesmo, mas a base que sustenta esse número é bem mais frágil, e o PreçoCaindo deve deixar essa diferença visível, não escondida atrás de um número igual.",
        ],
      },
      {
        heading: "Perguntas frequentes sobre o Score",
        body: [
          "Score 100 existe? Na prática é raro, porque exige preço no menor ponto histórico, histórico extenso e outros sinais positivos simultâneos — quando aparece, ainda assim vale conferir frete, prazo e versão antes de comprar.",
          "Score baixo significa produto ruim? Não — significa que o preço atual não está favorável em relação ao histórico daquele produto específico. Isso não diz nada sobre a qualidade do produto em si.",
        ],
      },
      {
        heading: "Checklist antes de confiar no Score",
        body: [],
        bullets: [
          "score lido com histórico",
          "dados suficientes verificados",
          "versão conferida",
          "orçamento respeitado",
          "decisão final feita por você",
        ],
      },
    ],
  },
] satisfies BaseGuide[];

export function guideText(guide: Pick<Guide, "title" | "description" | "sections">): string {
  return [
    guide.title,
    guide.description,
    ...guide.sections.flatMap((section) => [
      section.heading,
      ...section.body,
      ...(section.bullets ?? []),
    ]),
  ].join(" ");
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function calculateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

function enrichGuide(baseGuide: BaseGuide): Guide {
  // Every section is authored directly per guide in BASE_GUIDES — no shared
  // template function generates "depth" content anymore. That mechanism
  // produced near-identical boilerplate paragraphs across all 19 guides
  // (only a short focus phrase differed), which is exactly the templated/
  // scaled-content pattern this project must avoid. See
  // tests/editorial-guides.test.ts's anti-template check.
  const sections = baseGuide.sections;
  const wordCount = countWords(
    guideText({
      title: baseGuide.title,
      description: baseGuide.description,
      sections,
    }),
  );
  const readingMinutes = calculateReadingMinutes(wordCount);

  return {
    ...baseGuide,
    sections,
    wordCount,
    readingMinutes,
    readingTime: `${readingMinutes} min`,
  };
}

export const GUIDES: Guide[] = BASE_GUIDES.map(enrichGuide);

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

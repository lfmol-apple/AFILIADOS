import type { AmazonShowcaseCategory } from "@/lib/amazon/br-showcase";

/**
 * Editorial depth for /achados: per-product commentary, per-category buying
 * guides and an FAQ. Same hard rules as br-showcase.ts, enforced by
 * tests/amazon-br-showcase.test.tsx: NO price, discount, rating, review
 * count or availability claim, no unverified superlative, no image. Every
 * statement is a general buying criterion (what to measure, check or
 * compare) — never a spec we did not verify for the exact model.
 */

export const AMAZON_CONTENT_REVIEWED_ON = "20/09/2026";

export interface AmazonProductDetails {
  /** Who the product makes sense for. */
  paraQuem: string;
  /** When it is probably not the right pick. */
  naoIndicado: string;
  /** Concrete things to check before buying. */
  antesDeComprar: string[];
}

export const AMAZON_SHOWCASE_DETAILS: Record<string, AmazonProductDetails> = {
  "echo-dot": {
    paraQuem:
      "Quem quer começar com um assistente de voz ocupando pouco espaço: tocar música, ouvir notícias, criar alarmes e temporizadores de cozinha e controlar lâmpadas e tomadas compatíveis. Funciona bem em quarto, cozinha ou home office.",
    naoIndicado:
      "Se a ideia é encher a sala de música em volume alto, um alto-falante maior tende a atender melhor — este formato é pensado para ambientes pequenos.",
    antesDeComprar: [
      "Confirme que você tem Wi-Fi estável e um celular para configurar pelo aplicativo Alexa: quase tudo depende de internet.",
      "Veja se há botão físico para desligar o microfone. Se privacidade pesa para você, esse detalhe faz diferença.",
      "Liste os aparelhos que pretende controlar (lâmpadas, tomadas, TV) e confira se são compatíveis com a Alexa antes de contar com isso.",
    ],
  },
  "frigobar-brastemp-retro": {
    paraQuem:
      "Quarto, escritório, área de lazer coberta ou qualquer canto onde uma geladeira comum não cabe: bebidas, iogurtes, frutas e itens do dia a dia ficam à mão.",
    naoIndicado:
      "Não substitui a geladeira principal. Setenta e seis litros não comportam a compra semanal de uma família.",
    antesDeComprar: [
      "Meça altura, largura e profundidade do local e some a folga de ventilação pedida no manual — frigobar apertado demais esquenta e trabalha mais.",
      "Veja se existe compartimento para congelar e qual o tamanho dele; em frigobares costuma ser um espaço pequeno, só para gelo.",
      "Confira a voltagem do ponto onde vai ligar e considere o ruído do motor se for para um quarto.",
    ],
  },
  "bike-caloi-vulcan": {
    paraQuem:
      "Quem pedala por lazer em ruas com subidas, ciclovias e trilhas leves e quer marchas para variar o esforço, sem entrar no território de bicicletas de alto desempenho.",
    naoIndicado:
      "Para competição, longas distâncias com frequência ou trilhas técnicas, componentes e suspensão de nível mais alto fazem diferença real.",
    antesDeComprar: [
      "Consulte a tabela de tamanho de quadro pela sua altura. Quadro errado causa dor nas costas e nos punhos.",
      "Bicicletas vendidas online costumam chegar parcialmente montadas: decida se você mesmo monta ou se leva a uma oficina.",
      "Pense na manutenção: freios, câmbio e pneus pedem revisão periódica. Considere esse custo e a oficina mais próxima.",
    ],
  },
  "notebook-lenovo-ideapad": {
    paraQuem:
      "Estudo, trabalho de escritório, videochamadas, planilhas e navegação com várias abas abertas — os 12 GB de memória ajudam a manter vários programas rodando ao mesmo tempo.",
    naoIndicado:
      "Jogos pesados, edição de vídeo e modelagem 3D pedem placa de vídeo dedicada e um processador de geração mais recente.",
    antesDeComprar: [
      "Confirme se o 1 TB é HD (disco rígido) ou SSD. Um HD é bem mais lento para ligar o computador e abrir programas; se puder escolher, priorize SSD, mesmo com menos espaço.",
      "Veja a geração do processador e compare com modelos mais novos: o mesmo nome comercial pode esconder linhas mais antigas.",
      "Confira resolução e brilho da tela, peso, duração da bateria e se o sistema operacional já vem instalado.",
    ],
  },
  "cama-pet-grande": {
    paraQuem:
      "Cães de porte médio a grande que dormem dentro de casa e precisam de um lugar fixo de descanso, longe do piso frio.",
    naoIndicado:
      "Cães que roem ou rasgam tecido podem destruir uma cama em pouco tempo; nesse caso, procure materiais mais resistentes.",
    antesDeComprar: [
      "Meça seu cão deitado esticado e enrolado e compare com comprimento, largura e altura da borda informados no anúncio.",
      "Veja se a capa é removível e lavável: higiene pesa muito no dia a dia.",
      "Para cães idosos ou com dor nas articulações, verifique a espessura do enchimento — costumam precisar de mais amortecimento.",
    ],
  },
  "tenis-olympikus-perfect-2": {
    paraQuem:
      "Caminhada, academia e treinos leves de rotina, para quem quer um tênis esportivo de uso geral de uma marca nacional consolidada.",
    naoIndicado:
      "Quem corre longas distâncias com frequência deve testar com calma: um modelo de uso geral pode não ter o suporte específico que corredores de longa distância procuram.",
    antesDeComprar: [
      "Consulte a tabela de numeração da marca e, se possível, meça o pé em centímetros no fim do dia, quando ele está mais inchado.",
      "Leia a política de troca do vendedor: número errado é a devolução mais comum em calçados.",
      "Defina o uso principal (caminhar, academia, correr) e o tipo de piso, e escolha o amortecimento a partir disso.",
    ],
  },
  "geladeira-brastemp-inverse-443l": {
    paraQuem:
      "Famílias e quem cozinha e compra em volume. O congelador embaixo deixa o refrigerador na altura dos olhos, o que facilita o uso diário.",
    naoIndicado:
      "Cozinhas pequenas ou quem mora sozinho: um modelo desse porte ocupa muito espaço e tende a consumir mais energia que um menor.",
    antesDeComprar: [
      "Meça largura, altura e profundidade — e também o caminho até a cozinha: porta, corredor, elevador e curvas.",
      "Reserve a folga lateral e traseira indicada no manual e o espaço para abrir as portas sem bater em paredes ou móveis.",
      "Confira a voltagem, a etiqueta de eficiência energética e como será a entrega e a instalação.",
    ],
  },
  "bike-ergometrica-kikos": {
    paraQuem:
      "Quem quer treinar em casa com baixo impacto e pouco barulho, independentemente do clima: iniciantes, retorno gradual à atividade física e rotinas curtas.",
    naoIndicado:
      "Ciclistas experientes que buscam simular estrada ou programas avançados de treino podem achar o equipamento limitado.",
    antesDeComprar: [
      "Veja o peso máximo suportado pelo aparelho e compare com o do usuário.",
      "Confira o ajuste de banco e guidão para a sua altura — pedalar mal posicionado cansa e machuca.",
      "Sensores nas manoplas costumam dar uma referência aproximada dos batimentos; para treino guiado por frequência cardíaca, uma cinta é mais precisa.",
      "Reserve espaço e piso firme, e confira o tamanho do equipamento montado e se passa pela porta.",
    ],
  },
  "tigela-germanhart": {
    paraQuem:
      "Cães de porte pequeno a médio (ou gatos grandes) para ração ou água, para quem prefere inox pela facilidade de higienizar.",
    naoIndicado:
      "Cães que engolem a comida rapidamente podem se beneficiar de comedouros próprios para comer mais devagar.",
    antesDeComprar: [
      "Veja se há base antiderrapante: evita que a tigela escorregue e vire durante a refeição.",
      "Considere o diâmetro e a altura para o focinho do seu pet.",
      "Lave diariamente. Inox costuma ser mais simples de manter limpo que plástico; confirme com o fabricante se vai à lava-louças.",
    ],
  },
  "echo-show-5": {
    paraQuem:
      "Quem quer uma tela pequena para ver previsão do tempo, listas, receitas e lembretes, no quarto ou na cozinha, sem abrir o celular.",
    naoIndicado:
      "Se você só quer comandar por voz e ouvir música, o modelo sem tela ocupa menos espaço e resolve.",
    antesDeComprar: [
      "Confira se a geração que você está comprando tem câmera e qual é o recurso físico para cobri-la ou desativá-la.",
      "Verifique a compatibilidade com seus serviços de música e com seus aparelhos inteligentes.",
      "Escolha o local com antecedência: a tela pede uma superfície estável e uma tomada por perto.",
    ],
  },
  "lava-loucas-brastemp-14": {
    paraQuem:
      "Casas com três ou mais pessoas ou quem cozinha todo dia e acumula louça: tira uma tarefa diária da rotina e, em muitos casos, gasta menos água do que lavar tudo à mão.",
    naoIndicado:
      "Cozinhas sem espaço ou sem ponto de água e esgoto adequados para a instalação.",
    antesDeComprar: [
      "Confirme o ponto de entrada de água, o esgoto e a tomada do local, incluindo a voltagem.",
      "Meça o vão de instalação e o espaço para abrir a porta e puxar os cestos.",
      "Veja os consumíveis exigidos: detergente próprio e, em alguns modelos, sal e abrilhantador.",
      "Pesquise se há assistência técnica na sua cidade antes de fechar a compra.",
    ],
  },
  "fogao-atlas-monaco": {
    paraQuem:
      "Cozinha residencial padrão. A mesa de vidro facilita a limpeza no dia a dia em comparação a superfícies com relevo ou esmalte desgastado.",
    naoIndicado:
      "Quem usa panelas muito pesadas com frequência deve checar a resistência da mesa e das grades; o vidro pede cuidado com impactos.",
    antesDeComprar: [
      "Confirme o tipo de gás da sua casa (botijão ou encanado). Trocar de um para o outro exige conversão feita por técnico.",
      "Veja como funciona o acendimento e o que exatamente é bivolt no modelo — em fogões costuma ser só a parte elétrica.",
      "Meça o vão de instalação e combine a instalação com um profissional habilitado.",
    ],
  },
  "lampada-wifi-positivo": {
    paraQuem:
      "Quem quer experimentar automação residencial: agendar horários, mudar cor e intensidade pelo celular ou por voz, sem obra e sem trocar a instalação.",
    naoIndicado:
      "Se você prefere iluminação simples que não dependa de Wi-Fi nem de aplicativo, uma lâmpada comum é mais direta.",
    antesDeComprar: [
      "Confirme o soquete (por exemplo, E27) e a potência máxima da sua luminária.",
      "Veja se a sua rede Wi-Fi opera em 2,4 GHz: muitas lâmpadas inteligentes só conectam nessa faixa.",
      "Ao desligar pelo interruptor de parede a lâmpada perde o comando por voz e app; combine com a família de manter o interruptor ligado.",
    ],
  },
  "tapete-yoga-muvin": {
    paraQuem:
      "Quem está começando yoga, pilates ou alongamento em casa e quer uma superfície acolchoada e barata de testar antes de investir em algo mais técnico.",
    naoIndicado:
      "Praticantes avançados, com posturas de muita pegada e equilíbrio, costumam preferir materiais com mais aderência.",
    antesDeComprar: [
      "Veja a espessura: mais grosso amortece joelhos e punhos; mais fino dá mais estabilidade em posturas de equilíbrio.",
      "Confira se o comprimento cobre sua altura com o corpo esticado.",
      "Mantenha o tapete limpo e seco: suor e poeira reduzem a aderência ao longo do tempo.",
    ],
  },
  "smart-tv-semp-32": {
    paraQuem:
      "Quarto, cozinha, escritório ou segunda TV da casa: 32 polegadas cabem em espaços pequenos e o sistema com aplicativos de streaming dispensa aparelhos extras.",
    naoIndicado:
      "Como TV principal de uma sala ampla, uma tela maior é mais confortável. A resolução HD também mostra menos detalhe do que Full HD ou 4K, principalmente vista de perto.",
    antesDeComprar: [
      "Meça o espaço no móvel ou na parede e a distância de onde você assiste: sentado longe demais, uma tela de 32 polegadas fica pequena.",
      "Confira as entradas (HDMI e USB) e se há saída de áudio para caixa de som — TVs finas costumam ter som simples.",
      "Veja se o suporte de parede vem incluso (e qual o padrão de furação) e se os aplicativos de streaming que você usa funcionam no sistema da TV.",
    ],
  },
  "projetor-benq-th671st": {
    paraQuem:
      "Cinema em casa e jogos em sala pequena ou média: a projeção de curta distância entrega uma imagem grande a poucos metros da parede.",
    naoIndicado:
      "Quem quer usar de dia, com muita claridade e sem cortina blackout, vai se decepcionar com o contraste.",
    antesDeComprar: [
      "Use a calculadora de projeção do fabricante para saber a distância da parede necessária para o tamanho de imagem que você quer.",
      "Prepare a superfície: parede lisa e clara ou tela de projeção. Cortina blackout melhora muito o resultado.",
      "Confira as entradas (HDMI) e planeje o áudio — o som embutido em projetores costuma ser básico.",
      "Pesquise a vida útil da fonte de luz e o custo de reposição.",
    ],
  },
};

export interface AmazonCategoryGuide {
  intro: string;
  criterios: { titulo: string; texto: string }[];
}

export const AMAZON_CATEGORY_GUIDES: Record<
  AmazonShowcaseCategory,
  AmazonCategoryGuide
> = {
  Tecnologia: {
    intro:
      "Em tecnologia, o erro mais comum é comprar pelo nome e não pelo que o aparelho realmente vai fazer na sua rotina. Antes de olhar qualquer modelo, escreva as três coisas que você quer resolver e escolha a partir delas.",
    criterios: [
      {
        titulo: "Compatibilidade",
        texto:
          "Assistentes de voz, lâmpadas e tomadas inteligentes só funcionam bem juntos se falarem a mesma língua. Confira a lista de compatibilidade antes de montar a casa.",
      },
      {
        titulo: "Especificação que importa",
        texto:
          "Em computadores, o tipo de armazenamento (SSD ou HD) e a geração do processador mudam mais a experiência do que o número de gigabytes. Em qualquer aparelho, prefira comparar o que pesa no uso.",
      },
      {
        titulo: "Privacidade e rede",
        texto:
          "Aparelhos com microfone, câmera ou Wi-Fi merecem uma checagem: existe controle físico para desligar? Funcionam na rede que você tem em casa?",
      },
      {
        titulo: "Custo depois da compra",
        texto:
          "Verifique se o item exige acessórios, assinaturas ou peças de reposição que não estão incluídas.",
      },
    ],
  },
  "Casa & Eletrodomésticos": {
    intro:
      "Eletrodoméstico grande se compra com fita métrica na mão. A maioria das frustrações não vem do produto, e sim de medidas, voltagem e instalação que ninguém conferiu antes.",
    criterios: [
      {
        titulo: "Medidas com folga",
        texto:
          "Some a folga de ventilação e de abertura de portas ao tamanho do produto. Meça também o caminho de entrada: portas, corredores e elevadores.",
      },
      {
        titulo: "Voltagem e instalação",
        texto:
          "Confirme a tensão da tomada, o tipo de gás (botijão ou encanado) e se há ponto de água e esgoto quando o produto exigir.",
      },
      {
        titulo: "Consumo e manutenção",
        texto:
          "Olhe a etiqueta de eficiência energética e os consumíveis exigidos. O custo de uso ao longo dos anos pode pesar mais do que a diferença entre dois modelos.",
      },
      {
        titulo: "Assistência técnica",
        texto:
          "Pesquise se há autorizada na sua cidade e como funciona a garantia. Um bom produto sem suporte por perto vira dor de cabeça.",
      },
    ],
  },
  "Esporte & Fitness": {
    intro:
      "Equipamento esportivo só rende se combinar com o seu corpo, o seu espaço e a sua rotina real — não a rotina que você planeja ter. Comece simples e aumente o investimento quando o hábito estiver firme.",
    criterios: [
      {
        titulo: "Tamanho e ajuste",
        texto:
          "Quadro de bicicleta, número de tênis e comprimento de tapete dependem da sua altura e do seu pé. Consulte a tabela do fabricante em vez de adivinhar.",
      },
      {
        titulo: "Uso real",
        texto:
          "Um equipamento de uso geral atende bem quem está começando. Para treino específico ou de longa duração, os detalhes técnicos passam a fazer diferença.",
      },
      {
        titulo: "Espaço e segurança",
        texto:
          "Equipamentos costumam ocupar mais do que aparentam nas fotos. Confira peso máximo suportado, piso firme e área livre ao redor.",
      },
      {
        titulo: "Política de troca",
        texto:
          "Em calçados e itens de tamanho, leia as regras de troca do vendedor antes de comprar.",
      },
    ],
  },
  Pet: {
    intro:
      "Para o pet, conforto e higiene vêm antes de estética. Os melhores acessórios são os que o seu animal realmente usa — e que você consegue manter limpos sem esforço.",
    criterios: [
      {
        titulo: "Medidas do animal",
        texto:
          '"Grande" e "médio" variam de marca para marca. Meça seu pet deitado e compare com as dimensões reais do produto.',
      },
      {
        titulo: "Higiene",
        texto:
          "Capas removíveis, materiais laváveis e superfícies fáceis de limpar (como o inox) economizam tempo e ajudam a manter o ambiente saudável.",
      },
      {
        titulo: "Resistência ao comportamento",
        texto:
          "Se o seu cão rói ou rasga, escolha materiais mais duráveis e evite peças que possam ser engolidas.",
      },
      {
        titulo: "Idade e saúde",
        texto:
          "Animais idosos ou com dor nas articulações costumam precisar de mais amortecimento e de acesso fácil, sem degraus altos.",
      },
    ],
  },
};

export const AMAZON_FAQ: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Vocês vendem esses produtos?",
    resposta:
      'Não. O PreçoCaindo é um site de curadoria e comparação. Ao clicar em "Ver na Amazon", você vai direto para a página do produto na Amazon.com.br, e a compra, o pagamento e a entrega são feitos por lá.',
  },
  {
    pergunta: "Por que não aparece preço aqui?",
    resposta:
      "Preço e disponibilidade mudam o tempo todo, e só a Amazon sabe o valor correto no momento em que você compra. Preferimos não mostrar um número que possa estar desatualizado. Confira sempre o valor na página do produto.",
  },
  {
    pergunta: "Como o PreçoCaindo ganha dinheiro com isso?",
    resposta:
      "Somos participantes do Programa de Associados da Amazon: quando alguém compra depois de clicar em um link nosso, podemos receber uma comissão. Isso não aumenta o preço que você paga e não muda o que escrevemos sobre o produto.",
  },
  {
    pergunta: "Como vocês escolhem os produtos?",
    resposta:
      "Cada item é escolhido por decisão editorial, com título e marca conferidos na página do produto. Depois escrevemos para quem ele faz sentido, quando não é a melhor escolha e o que conferir antes de comprar. Não escolhemos por ranking automático.",
  },
  {
    pergunta: "Posso confiar que a análise é imparcial?",
    resposta:
      "Nossa análise fala de critérios de compra, não de promessas: não afirmamos notas, vendas ou superlativos que não possamos comprovar. Você pode conhecer nosso processo na política editorial.",
  },
];

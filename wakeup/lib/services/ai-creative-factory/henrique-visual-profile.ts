/**
 * Perfil visual real do Henrique (owner's directive, 2026-11-20:
 * "Calibração Visual da Fábrica de Criativos com as Artes do Henrique").
 *
 * Extraído por inspeção direta de 15 artes reais que ele produziu e
 * aprovou ao longo de meses usando o ChatGPT (16 arquivos recuperados,
 * 1 descartado por ser um print de Instagram sem relação com criativos
 * de produto). Isto NÃO é um prompt novo nem uma reinterpretação minha —
 * é o registro do que já funcionava, para parar de adivinhar.
 *
 * Achado central: as artes aprovadas NÃO usam um layout fixo de "coluna
 * de texto + coluna de foto" com ícones genéricos. O layout muda por
 * produto; o que é realmente fixo é uma lista pequena de elementos
 * comerciais e um conjunto de regras de qualidade — não uma grade.
 */

/** Elementos 100% recorrentes nas 15 artes reais — nunca variam. */
export const RECURRING_ELEMENTS = {
  footerBanner: {
    description:
      "Faixa amarela full-width (ou, numa variante, uma linha só) com o logo REAL do Mercado Livre (ícone do aperto de mãos) + wordmark à esquerda, separador vertical, e um botão azul-marinho arredondado 'Compre agora no Mercado Livre' com chevron '>' à direita. Presente, idêntico em estrutura, nas 15 artes.",
    requiresRealLogo: true,
  },
  priceBadge: {
    description:
      "Selo de preço: faixa vermelha 'Por apenas' (só quando há preço de referência real/desconto confirmado) sobre uma bolha amarela com o preço em destaque, fonte bold grande. Sem desconto real, a bolha amarela aparece sozinha, sem a faixa 'Por apenas'.",
    ratingPill:
      "Quando há nota/quantidade vendida REAL, aparece um selo branco pequeno com borda dourada: '⭐ X,X/5 • +N vendidos'. Nunca inventado.",
  },
  productPhoto: {
    description:
      "A foto do produto é sempre o elemento dominante (50-70% da área). Três variações observadas: (1) still de estúdio isolado, (2) lifestyle com modelo usando/segurando o produto, (3) still principal + acessórios reais dispostos ao redor + inset circular com foto de uso/contexto.",
  },
  headline: {
    description:
      "Nome do produto/categoria em destaque, sans-serif bold/heavy, normalmente em 2 cores alternadas (ex.: verde escuro + vermelho, preto + vermelho) tiradas da paleta real da marca ou categoria. Serifada SOMENTE quando o logotipo real do produto já é serifado (ex.: Hidrabene).",
  },
  realBrandLogo: {
    description:
      "Quando o produto tem um logotipo de marca real e reconhecível (Philips, Kärcher, Electrolux, Lupo, ISDIN, Integralmédica, Hidrabene), esse logotipo é redesenhado no topo da peça. O Henrique já faz isso e aprova — decisão dele, não um bloqueio técnico nosso.",
  },
} as const;

/** Elementos que VARIAM por produto/categoria — nunca forçar um padrão único. */
export const VARIABLE_ELEMENTS = {
  benefitIcons: {
    present: "0 a 5 ícones, conforme o produto tenha ou não benefícios reais suficientes para justificá-los.",
    style:
      "Ícones simples, de 1-2 cores, DESENHANDO literalmente o benefício real (sol = proteção UV, gota = hidratação/água, carro = limpeza automotiva, casa = uso multiuso, escudo = resistência/hipoalergênico). Nunca um círculo vazio ou forma genérica sem desenho.",
    container:
      "Dois formatos observados, ambos válidos: (a) ícone dentro de um círculo ou quadrado colorido sólido, rótulo ao lado; (b) ícone de linha colorida sem fundo nenhum, rótulo ao lado. A cor do ícone vem da paleta real do produto/categoria, nunca uma cor fixa do site.",
    labelLength: "2 a 4 palavras, no máximo 2 linhas curtas — NUNCA uma frase corrida.",
  },
  layoutStructure: {
    options: [
      "foto full-bleed com selo de preço sobrepondo o canto inferior (sem painel de texto separado)",
      "coluna de texto à esquerda + foto à direita (usado quando há bastante benefício real pra listar)",
      "colagem: produto principal + acessórios reais + inset circular de contexto/uso",
    ],
    rule: "A escolha do layout depende de quanto conteúdo real existe pra mostrar — nunca force uma estrutura fixa em todo produto.",
  },
  colorHarmony: {
    rule:
      "Quando existe um painel de texto separado da foto (layout 2 acima), a cor de fundo do painel é escolhida para COMBINAR com o tom da foto/produto (ex.: painel rosa-claro ao lado de produto rosa) — isso é o que evita a sensação de colagem, não a ausência literal de uma borda. Um painel branco puro ao lado de uma foto com fundo de ambientação diferente (bege, cinza) LÊ como erro — ver `FORBIDDEN_VISUAL_ERRORS`.",
  },
  humanModel: {
    rule: "Presente em categorias onde demonstrar o uso importa (beleza, grooming). Ausente quando o produto se explica sozinho (ferramentas, suplementos, eletrônicos simples).",
  },
} as const;

/** Erros visuais observados nas MINHAS tentativas anteriores — nunca repetir. */
export const FORBIDDEN_VISUAL_ERRORS = [
  "Ícone vazio (círculo/anel sem nenhum desenho dentro) — todo ícone tem que representar visualmente o benefício real.",
  "Painel de texto com cor de fundo que não tem nenhuma relação com o tom da foto ao lado (ex.: branco puro ao lado de fundo bege) — escolher a cor do painel a partir da paleta real do produto/categoria.",
  "Rótulo de benefício como frase longa — manter em 2-4 palavras.",
  "Usar `transform: rotate(...)` em qualquer elemento composto via Satori/next-og — confirmado neste projeto que não renderiza (2026-11-20).",
  "Inventar nota, quantidade vendida, benefício ou especificação que não vem de um dado real já confirmado em outro lugar do sistema.",
  "Alterar o produto real (embalagem, cor, proporção) para a peça parecer mais vendável.",
  "Forçar a MESMA estrutura de layout em produtos de categorias muito diferentes — o Henrique varia a composição conforme o que há de real para mostrar.",
] as const;

/** Produtos do mesmo nicho ("lavadora de alta pressão") já têm, nas
 * referências reais, o MESMO esqueleto de composição com marca/preço/
 * fotos trocadas — confirma que reaproveitar uma composição por
 * categoria (não por produto individual) é uma prática real do
 * Henrique, não uma suposição nossa. */
export const CONFIRMED_CATEGORY_TEMPLATE_REUSE = {
  category: "lavadora de alta pressão",
  evidence: "Electrolux EasyWash e Kärcher K-series usam a mesma estrutura: logo da marca no topo, título 2 linhas, 4 ícones em quadrado colorido à esquerda com rótulo de 2 linhas, produto + acessórios reais dispostos à direita, selo de preço vermelho/amarelo embaixo, banner padrão.",
};

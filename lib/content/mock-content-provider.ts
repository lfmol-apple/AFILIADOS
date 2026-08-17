import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  ContentProvider,
  ProductFacts,
} from "@/types/content";

/**
 * Deterministic, template-based generator that uses only the facts it
 * receives — no external model call. Exists so the whole content pipeline
 * (generation -> quality gate -> publish) can be developed and tested before
 * a real LLM provider is wired up. Doubles as a concrete example of how to
 * respect the no-hallucination rule: every sentence below is gated behind an
 * `if` on the corresponding fact.
 */
export class MockContentProvider implements ContentProvider {
  readonly name = "mock";

  async generate(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResult> {
    if (request.contentType === "PRODUCT") {
      return generateProductReview(
        request.facts as ProductFacts,
        request.promptVersion,
      );
    }
    return generateGenericFallback(request);
  }
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    value,
  );
}

function generateProductReview(
  facts: ProductFacts,
  promptVersion: string,
): ContentGenerationResult {
  const lines: string[] = [];

  // -- O preço está bom? --
  lines.push("## O preço está bom?");
  const priceParts: string[] = [
    `O preço atual é ${money(facts.currentPrice, facts.currency)}.`,
  ];
  if (facts.avg30d) {
    const vsAvg = facts.currentPrice < facts.avg30d ? "abaixo" : "acima";
    priceParts.push(
      `Isso está ${vsAvg} da média dos últimos 30 dias, que foi de ${money(facts.avg30d, facts.currency)}.`,
    );
  }
  if (facts.lowestPrice !== undefined && facts.highestPrice !== undefined) {
    priceParts.push(
      `No período acompanhado, o menor preço observado foi ${money(facts.lowestPrice, facts.currency)} e o maior foi ${money(facts.highestPrice, facts.currency)}.`,
    );
  }
  priceParts.push(
    facts.coverageDays < 30
      ? `Estamos acompanhando este produto há ${facts.coverageDays} dia(s) — ainda é pouco tempo para afirmar que este é o menor preço histórico.`
      : `Este histórico cobre ${facts.coverageDays} dias de observação direta do PreçoCaindo.`,
  );
  if (facts.opportunityLabel) {
    priceParts.push(
      `Segundo o Score PreçoCaindo, a avaliação atual é: "${facts.opportunityLabel}".`,
    );
  }
  lines.push(priceParts.join(" "));

  // -- Para quem faz sentido --
  lines.push("\n## Para quem faz sentido");
  const forWhomParts: string[] = [];
  if (facts.categoryName) {
    forWhomParts.push(
      `Este produto se encaixa na categoria ${facts.categoryName}.`,
    );
  }
  if (facts.description) {
    forWhomParts.push(facts.description);
  }
  lines.push(
    forWhomParts.length > 0
      ? forWhomParts.join(" ")
      : "Não há informações suficientes para recomendar um perfil de uso específico.",
  );

  // -- Pontos fortes --
  lines.push("\n## Pontos fortes");
  const specs = facts.specifications ?? {};
  const specEntries = Object.entries(specs);
  if (specEntries.length > 0) {
    lines.push(
      specEntries.map(([key, value]) => `- ${key}: ${value}`).join("\n"),
    );
  } else {
    lines.push(
      "Ainda não temos especificações suficientes para destacar pontos fortes específicos.",
    );
  }

  // -- Pontos de atenção --
  lines.push("\n## Pontos de atenção");
  const attentionParts: string[] = [];
  if (facts.rating === undefined || facts.reviewCount === undefined) {
    attentionParts.push(
      "Ainda não há avaliações suficientes de compradores para este produto.",
    );
  }
  if (facts.coverageDays < 30) {
    attentionParts.push(
      "O histórico de preços coletado ainda é curto para garantir tendências de longo prazo.",
    );
  }
  lines.push(
    attentionParts.length > 0
      ? attentionParts.join(" ")
      : "Não identificamos pontos de atenção específicos com os dados disponíveis no momento.",
  );

  // -- Metodologia --
  lines.push("\n## Metodologia");
  lines.push(
    "O Score PreçoCaindo é calculado com metodologia própria a partir do histórico de preços " +
      "coletado diretamente pelo PreçoCaindo, e não é uma recomendação da Amazon. Preços e " +
      "disponibilidade podem mudar a qualquer momento; confira sempre o valor atual na página do produto.",
  );

  const body = lines.join("\n");
  const title = facts.title;
  const metaTitle = truncate(
    `${facts.title} — vale a pena comprar agora? | PreçoCaindo`,
    70,
  );
  const metaDescription = truncate(
    `Veja o histórico de preço, o Score PreçoCaindo e se ${facts.title} está com um preço realmente bom agora.`,
    160,
  );

  return {
    title,
    metaTitle,
    metaDescription,
    body,
    model: "mock",
    promptVersion,
  };
}

function generateGenericFallback(
  request: ContentGenerationRequest,
): ContentGenerationResult {
  const title =
    typeof request.facts.title === "string"
      ? request.facts.title
      : request.slug;
  const body = [
    `## Sobre ${title}`,
    `Conteúdo gerado automaticamente para ${request.contentType.toLowerCase()} ainda não possui um template dedicado no MockContentProvider.`,
    "## Metodologia",
    "Análise baseada em dados próprios do PreçoCaindo.",
  ].join("\n\n");
  return {
    title,
    metaTitle: truncate(`${title} | PreçoCaindo`, 70),
    metaDescription: truncate(`Análise do PreçoCaindo sobre ${title}.`, 160),
    body,
    model: "mock",
    promptVersion: request.promptVersion,
  };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

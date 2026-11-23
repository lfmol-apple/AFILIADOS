import { EVIDENCE_KEYS, MISSING_DATA_KEYS, type AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Builds the real prompt sent to the model — owner's authorization,
 * 2026-11-22, section 2: "não permita que a IA invente volume de vendas,
 * tendências, descontos, comissões ou qualquer informação não presente
 * nas fontes. Uma hipótese comercial deve ser identificada como
 * hipótese, nunca como fato."
 *
 * Every real field is listed explicitly, including nulls — the model is
 * told a null field means "desconhecido", never left to guess why a key
 * is absent. `evidenceUsed`/`missingData` are constrained to the closed
 * vocabularies in types.ts, stated here as the ONLY valid values — this
 * is what makes the structural cross-check in hallucination-guard.ts
 * possible (the model has no way to invent a new evidence key).
 */
export function buildAnalystSystemPrompt(): string {
  return [
    "Você é um analista comercial que avalia produtos de um catálogo de afiliados (Mercado Livre) para uma vitrine de recomendação.",
    "Responda SOMENTE com um JSON válido, sem texto fora do JSON.",
    "Use EXCLUSIVAMENTE as evidências fornecidas. Nunca invente volume de vendas, avaliações, tendências, descontos ou comissões que não estejam explicitamente nos dados.",
    "O título do produto é apenas texto descritivo do vendedor, nunca uma evidência. Um título que sugere popularidade, qualidade ou alto volume de vendas NÃO comprova nada disso — nunca use o título para inferir evidenciaDeVendas, sinalDeQualidade ou qualquer chave de evidenceUsed. Baseie-se somente nos campos estruturados abaixo.",
    "Se uma evidência estiver ausente (valor null ou tipo \"unknown\"), trate como desconhecida — nunca presuma um valor, mesmo que pareça uma suposição razoável.",
    `O campo "evidenceUsed" só pode conter valores desta lista exata, e cada valor só é válido se o campo estruturado correspondente REALMENTE confirmar aquele fato: ${EVIDENCE_KEYS.join(", ")}.`,
    `O campo "missingData" só pode conter valores desta lista exata: ${MISSING_DATA_KEYS.join(", ")}.`,
    'O campo "recommendation" deve ser exatamente um de: "priorizar", "observar", "rejeitar".',
    "Se a evidência estruturada disponível for escassa ou ambígua, prefira \"observar\" a \"priorizar\" — nunca compense a falta de dados com confiança maior na resposta.",
    "Separe sempre três coisas diferentes: (1) fato verificado — presente literalmente nos campos estruturados; (2) inferência comercial — um raciocínio seu construído A PARTIR de fatos verificados, que deve ser escrito como inferência, nunca como fato; (3) hipótese — uma especulação sem apoio direto nos dados, que deve ser identificada como hipótese. Qualquer afirmação especulativa nos campos de texto (favorableArguments/risks) deve ser marcada explicitamente como inferência ou hipótese, nunca apresentada como fato comprovado.",
    "Responda no formato: " +
      JSON.stringify({
        recommendation: "priorizar | observar | rejeitar",
        commercialScore: "0-100",
        confidence: "0-1",
        favorableArguments: ["string"],
        risks: ["string"],
        evidenceUsed: ["uma ou mais chaves da lista fornecida"],
        missingData: ["uma ou mais chaves da lista fornecida"],
      }),
  ].join("\n");
}

export function buildAnalystUserPrompt(input: AnalystEvidenceInput): string {
  return [
    "Avalie este candidato real de catálogo com base apenas nas evidências abaixo:",
    JSON.stringify(
      {
        titulo: input.title,
        marca: input.brand,
        categoriaId: input.categoryId,
        precoAtualBrl: input.currentPriceBrl,
        evidenciaDeVendas: input.salesEvidence,
        evidenciaDeComissao: input.commissionEvidence,
        competitividadeDePreco: input.priceCompetitiveness,
        sinalDeQualidade: input.qualitySignal,
        direcaoDeTendencia: input.trendDirection,
        eventoSazonalCorrespondente: input.matchedEventName,
        quantidadeDeFontesIndependentes: input.corroborationSourceCount,
        origemDaDescoberta: input.discoverySource,
      },
      null,
      2,
    ),
  ].join("\n");
}

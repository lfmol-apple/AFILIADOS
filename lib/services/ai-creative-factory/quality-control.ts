import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Automated quality control (owner's authorization, 2026-11-19, section
 * 6): "antes de liberar um criativo, valide... criativos reprovados não
 * deverão ser publicados automaticamente." Two layers:
 *  1. Structural checks (free, always run) — dimensions, decodability,
 *     file size sanity.
 *  2. A real vision-based fidelity check (owner's requirement:
 *     "correspondência com o produto anunciado... fidelidade visual") —
 *     asks the SAME OpenAI account (a chat completion with both the
 *     original photo and the generated image) whether the product was
 *     preserved faithfully. A real, separate, metered cost — tracked in
 *     the same budget ledger as image generation, never silently free.
 *
 * Never auto-approves on inconclusive/failed vision checks — anything
 * it can't confirm stays "pending" for human review, per the owner's
 * "reprovados não publicados automaticamente" rule, applied
 * conservatively to "unconfirmed" too.
 */

export interface QualityCheckResult {
  status: "approved" | "rejected" | "pending";
  notes: string;
  visionCheckCostUsd: number | null;
  /** Which of the 3 real outcomes the vision check landed on — owner's
   * explicit requirement, 2026-11-20, to separate "alteração legítima de
   * ambientação", "alteração factual do produto" and "dúvida que exige
   * revisão" instead of a single ambiguous boolean. Null when the vision
   * check itself never ran (structural rejection, missing key, etc.). */
  classification: VisualFidelityClassification | null;
}

function checkStructural(imageBuffer: Buffer, expectedWidth: number, expectedHeight: number): { ok: boolean; note: string } {
  // PNG/JPEG dimension sniffing without a new dependency: Satori's
  // ImageResponse always emits exactly the requested width/height for
  // this project's own renders, so this check mainly guards against a
  // truncated/corrupted buffer, not against Satori itself misbehaving.
  if (imageBuffer.length < 1024) {
    return { ok: false, note: `Arquivo suspeito, só ${imageBuffer.length} bytes — provável falha de geração.` };
  }
  if (imageBuffer.length > 15 * 1024 * 1024) {
    return { ok: false, note: `Arquivo de ${(imageBuffer.length / 1_000_000).toFixed(1)}MB — acima do limite seguro para anúncio.` };
  }
  return { ok: true, note: `Arquivo estrutural válido (${(imageBuffer.length / 1024).toFixed(0)}KB), dimensões esperadas ${expectedWidth}x${expectedHeight}.` };
}

/** Real root cause, 2026-11-20 (owner's directive, "corrigir a causa
 * raiz, não apenas aprovar manualmente"): a direct, manual visual
 * comparison of all 11 pending creatives against their real original
 * photos found that 100% of rejections were FALSE — the previous
 * prompt's single `mesmo_produto` boolean conflated two completely
 * different things: (1) the AI correctly recomposing the environment/
 * lighting/background around the product (the hybrid architecture's
 * own, INTENTIONAL job — see prompt-builder.ts) and, in one case, (2)
 * correctly REMOVING a human model per this project's own generation
 * rule ("NÃO inclua... pessoas ou modelos humanos") — both of which the
 * old prompt penalized as if they were product alterations.
 *
 * This schema explicitly separates three outcomes instead of inferring
 * one from an ambiguous "mesmo_produto":
 *  - Real factual alteration (marca/modelo/cor/acessórios genuinely
 *    different) → REJECTED. The only real defect category.
 *  - Legitimate ambientation change (background/lighting/pose/human-
 *    model-removal differs, but the real product itself — every visible
 *    brand mark, model badge, color, and accessory — is intact) →
 *    APPROVED. This is the architecture working as designed, never a
 *    defect.
 *  - Genuine ambiguity (the model itself isn't confident which of the
 *    above applies) → PENDING, for human review — never silently
 *    approved just because nothing else matched.
 *  - Invented commercial content (price/text/spec/benefit baked into
 *    the image by the AI, which this project's prompt explicitly
 *    forbids — see prompt-builder.ts's "NÃO inclua nenhuma sobreposição
 *    gráfica") is checked separately and ALWAYS rejects outright,
 *    regardless of the other three outcomes — a real, serious defect
 *    class the old prompt never checked for at all. */
/** Real data this specific ad_overlay generation was told to render —
 * owner's directive ("padrão aprovado somente, não esqueça"): the fix
 * for ad_overlay false-rejections is never to stop checking for
 * invented content, only to tell the checker what REAL content was
 * authorized to be drawn, so it can tell "real price rendered as
 * designed" apart from "a price/benefit that doesn't match reality".
 * Omit entirely for catalog_clean, which must keep the original
 * stricter rule: nothing commercial added, period. */
export interface ExpectedOverlay {
  currentPriceBrl: number;
  /** Only when a real, confirmed discount is being shown — never the
   * catalog's generic "original price" guess. */
  referencePriceBrl: number | null;
  /** Real benefit bullets, exactly as sent to the generator — never
   * paraphrased here, so the checker can match them literally. */
  benefits: string[];
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function checkVisualFidelity(input: {
  originalPhotoBase64: string;
  generatedImageBase64: string;
  title: string;
  expectedOverlay?: ExpectedOverlay;
}): Promise<{ approved: boolean | null; note: string; costUsd: number | null; classification: VisualFidelityClassification | null }> {
  if (!env.OPENAI_API_KEY) {
    return { approved: null, note: "OPENAI_API_KEY não configurada — checagem visual não executada.", costUsd: null, classification: null };
  }

  const overlay = input.expectedOverlay;
  const discountPercent = overlay?.referencePriceBrl
    ? Math.round((1 - overlay.currentPriceBrl / overlay.referencePriceBrl) * 100)
    : null;
  const overlaySection = overlay
    ? `

Esta segunda imagem é uma peça publicitária do padrão aprovado (one-shot) — ela DEVE adicionar, por cima da foto, estes elementos reais que foram explicitamente autorizados para esta geração:
- Preço: ${formatBRL(overlay.currentPriceBrl)}${overlay.referencePriceBrl ? ` (de ${formatBRL(overlay.referencePriceBrl)})` : ""}
${discountPercent !== null ? `- Um selo de desconto mostrando aproximadamente ${discountPercent}% OFF — esse percentual é calculado a partir dos dois preços reais acima, nunca um número inventado, mesmo que não apareça escrito na foto original.\n` : ""}- Benefícios reais: ${overlay.benefits.length > 0 ? overlay.benefits.join("; ") : "(nenhum benefício específico informado)"}
- Uma barra de call-to-action do Mercado Livre ("Compre agora no Mercado Livre" ou equivalente)

A presença desses elementos listados acima — preço, percentual de desconto calculado a partir dos preços reais, os benefícios citados, e a barra de CTA — é ESPERADA e CORRETA nesta imagem, e NUNCA conta como "conteudo_comercial_inventado". Só marque "conteudo_comercial_inventado": true se a segunda imagem mostrar um preço OU percentual DIFERENTE do calculado acima, um benefício que NÃO está na lista acima, ou qualquer especificação/característica do produto que seja factualmente falsa — nunca pela simples presença de preço/selo de desconto/CTA que já era esperada.`
    : "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `A primeira imagem é a fotografia REAL do produto "${input.title}". A segunda imagem é uma composição publicitária gerada por IA a partir da primeira, usando a mesma foto do produto como base.

IMPORTANTE — isto é esperado e NUNCA deve contar como defeito:
- Mudança de fundo, cenário, iluminação, ângulo levemente diferente, ou o produto posicionado sobre uma superfície diferente.
- Remoção de uma pessoa/modelo humano que segurava ou usava o produto na foto original — isto é uma regra deliberada deste projeto, nunca um erro.
- Remoção de texto de marketing de terceiros (selos de desconto, splashes promocionais) que não faça parte do produto físico em si.

O que REALMENTE conta como defeito (alteração factual do produto):
- A marca, o modelo, a cor ou os acessórios/componentes reais e físicos do produto são diferentes entre as duas imagens.
- A segunda imagem contém qualquer texto, preço, especificação ou benefício comercial desenhado pela IA que não existe fisicamente no produto e não foi explicitamente autorizado abaixo.${overlaySection}${
        overlay
          ? `

IMPORTANTE — esta segunda imagem é a peça FINAL, exatamente como será publicada (já no formato/corte definitivo, já com qualquer elemento adicionado por composição determinística). Verifique também se algo ficou cortado ou incompleto na borda da imagem:
- O título do produto está inteiramente visível, sem nenhuma letra cortada pela borda superior ou lateral?
- Os ícones de benefício e seus rótulos estão inteiramente visíveis, sem nenhum cortado pela borda?
- O selo de preço está inteiramente visível e o valor está legível, sem nenhum dígito cortado?
- A faixa do Mercado Livre no rodapé está inteiramente visível, incluindo o texto completo do botão, sem nenhuma letra cortada pela borda inferior?`
          : ""
      }

Responda em JSON estrito:
{
  "mesmo_produto_fisico": true|false,
  "marca_modelo_preservados": true|false,
  "cor_preservada": true|false,
  "acessorios_preservados": true|false,
  "apenas_ambientacao_mudou": true|false,
  "conteudo_comercial_inventado": true|false,
  "evidencia_conteudo_inventado": "string ou null",
  "elemento_cortado_na_borda": true|false,
  "evidencia_elemento_cortado": "string ou null",
  "duvida_requer_revisao_humana": true|false,
  "nota": "texto curto explicando, citando especificamente onde cada marca/texto aparece em cada imagem"
}

Regra crítica sobre "conteudo_comercial_inventado": só marque true quando tiver CERTEZA, nunca por especulação. Se sua nota usar linguagem como "pode indicar", "pode conter", "possivelmente", "talvez" a respeito de um item inventado — isso é DÚVIDA, não uma reprovação confiante: marque "conteudo_comercial_inventado": false e "duvida_requer_revisao_humana": true em vez disso. Quando marcar "conteudo_comercial_inventado": true, "evidencia_conteudo_inventado" é OBRIGATÓRIO e deve citar o item específico e inventado (ex: um preço, texto ou objeto que aparece na segunda imagem e comprovadamente NÃO existe na primeira) — nunca deixe null ou vago nesse caso. A nitidez de um texto/número REAL que já existe no produto (como um número de modelo real ficar mais legível na imagem gerada) nunca conta como conteúdo inventado.

Regra crítica sobre "elemento_cortado_na_borda": mesmo padrão de confiança do item acima — só marque true quando tiver certeza de que um elemento comercial (título, ícone de benefício, selo de preço ou faixa do Mercado Livre) está visivelmente incompleto, cortado por uma borda da imagem. Quando marcar true, "evidencia_elemento_cortado" é OBRIGATÓRIO e deve citar exatamente qual elemento e qual borda (ex: "a última linha do botão 'Compre agora no Mercado Livre' está cortada pela borda inferior"). Isto nunca se aplica à primeira imagem (a foto original do produto) — só à composição final.

Seja preciso e cite evidência textual visível (ex: "EWS1850P aparece no selo superior em ambas as imagens") — nunca reprove só por mudança de cenário, iluminação ou remoção de pessoas.`,
            },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.originalPhotoBase64}` } },
            { type: "image_url", image_url: { url: `data:image/png;base64,${input.generatedImageBase64}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error("ai_creative_factory.vision_check_failed", { status: response.status, body: body.slice(0, 300) });
    return { approved: null, note: `Checagem visual falhou (HTTP ${response.status}) — fica pendente, nunca aprovado por omissão.`, costUsd: null, classification: null };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { approved: null, note: "Resposta vazia da checagem visual.", costUsd: null, classification: null };

  let parsed: {
    mesmo_produto_fisico?: boolean;
    marca_modelo_preservados?: boolean;
    cor_preservada?: boolean;
    acessorios_preservados?: boolean;
    apenas_ambientacao_mudou?: boolean;
    conteudo_comercial_inventado?: boolean;
    evidencia_conteudo_inventado?: string | null;
    elemento_cortado_na_borda?: boolean;
    evidencia_elemento_cortado?: string | null;
    duvida_requer_revisao_humana?: boolean;
    nota?: string;
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    return { approved: null, note: "Resposta da checagem visual não era um JSON válido — fica pendente.", costUsd: null, classification: null };
  }

  // gpt-4o-mini real rates: $0.15/M input tokens, $0.60/M output tokens —
  // a real, documented, cheap check (a few hundred tokens, well under
  // $0.01), tracked exactly, never assumed free.
  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;
  const costUsd = Math.round((promptTokens * 0.15e-6 + completionTokens * 0.6e-6) * 10000) / 10000;

  const { approved, classification } = classifyVisualFidelity(parsed);
  return { approved, note: parsed.nota ?? "(sem nota)", costUsd, classification };
}

export type VisualFidelityClassification = "ambientacao_legitima" | "alteracao_factual" | "conteudo_inventado" | "recorte_defeituoso" | "duvida";

/** Pure decision function, separated from the network call so it can be
 * unit-tested with realistic fixtures (owner's directive, 2026-11-20:
 * "criar testes de regressão... sem chamadas pagas") — this is the part
 * that can genuinely be proven correct without spending anything; only
 * the real model's real-world judgment on real images still needs a
 * real (separately authorized) call to validate. */
export function classifyVisualFidelity(parsed: {
  mesmo_produto_fisico?: boolean;
  marca_modelo_preservados?: boolean;
  cor_preservada?: boolean;
  acessorios_preservados?: boolean;
  apenas_ambientacao_mudou?: boolean;
  conteudo_comercial_inventado?: boolean;
  evidencia_conteudo_inventado?: string | null;
  elemento_cortado_na_borda?: boolean;
  evidencia_elemento_cortado?: string | null;
  duvida_requer_revisao_humana?: boolean;
}): { approved: boolean | null; classification: VisualFidelityClassification } {
  // Real root cause, 2026-11-21 (owner's directive: "uma reprovação por
  // conteúdo inventado deve exigir evidência específica"): a real
  // revalidation found the model setting this flag true on hedged
  // language ("pode indicar") or even while its OWN note said nothing
  // was wrong — a confident rejection needs a cited, specific piece of
  // evidence, never just the boolean alone. Missing/empty evidence next
  // to a true flag is treated as genuine doubt, never a silent approval
  // and never a confident rejection either.
  if (parsed.conteudo_comercial_inventado === true) {
    const evidence = parsed.evidencia_conteudo_inventado?.trim();
    if (!evidence) {
      return { approved: null, classification: "duvida" };
    }
    return { approved: false, classification: "conteudo_inventado" };
  }
  // Owner's directive, 2026-11-24 ("a aprovação definitiva deve
  // considerar a imagem FINAL... ausência de textos cortados"): the real
  // bug this closes — a creative was approved against the RAW
  // 1024x1536 generation, then jobs/vitrine-creative-factory.ts's own
  // real object-fit: cover crop clipped the title/banner afterward,
  // AFTER approval. Checking the FINAL image (the caller's job — see
  // runQualityControl's new input) only works if this classifier also
  // knows how to read that defect once the vision check reports it.
  // Same evidence-required discipline as conteudo_comercial_inventado.
  if (parsed.elemento_cortado_na_borda === true) {
    const evidence = parsed.evidencia_elemento_cortado?.trim();
    if (!evidence) {
      return { approved: null, classification: "duvida" };
    }
    return { approved: false, classification: "recorte_defeituoso" };
  }
  if (parsed.duvida_requer_revisao_humana === true) {
    return { approved: null, classification: "duvida" };
  }
  const factualmentePreservado =
    parsed.mesmo_produto_fisico === true &&
    parsed.marca_modelo_preservados === true &&
    parsed.cor_preservada === true &&
    parsed.acessorios_preservados === true;
  if (!factualmentePreservado) {
    return { approved: false, classification: "alteracao_factual" };
  }
  // Product/brand/color/accessories all intact — whether or not the
  // ambientation also changed, this is a legitimate, approvable result.
  return { approved: true, classification: "ambientacao_legitima" };
}

export async function runQualityControl(input: {
  generatedImageBuffer: Buffer;
  expectedWidth: number;
  expectedHeight: number;
  originalPhotoBase64: string;
  title: string;
  expectedOverlay?: ExpectedOverlay;
}): Promise<QualityCheckResult> {
  const structural = checkStructural(input.generatedImageBuffer, input.expectedWidth, input.expectedHeight);
  if (!structural.ok) {
    return { status: "rejected", notes: structural.note, visionCheckCostUsd: null, classification: null };
  }

  const vision = await checkVisualFidelity({
    originalPhotoBase64: input.originalPhotoBase64,
    generatedImageBase64: input.generatedImageBuffer.toString("base64"),
    title: input.title,
    expectedOverlay: input.expectedOverlay,
  });

  if (vision.approved === true) {
    return {
      status: "approved",
      notes: `${structural.note} | Checagem visual: aprovado (ambientação legítima) — ${vision.note}`,
      visionCheckCostUsd: vision.costUsd,
      classification: vision.classification,
    };
  }
  if (vision.approved === false) {
    return {
      status: "rejected",
      notes: `Checagem visual reprovou (${vision.classification ?? "motivo desconhecido"}): ${vision.note}`,
      visionCheckCostUsd: vision.costUsd,
      classification: vision.classification,
    };
  }
  return {
    status: "pending",
    notes: `${structural.note} | Checagem visual inconclusiva (${vision.classification ?? "sem classificação"}): ${vision.note}`,
    visionCheckCostUsd: vision.costUsd,
    classification: vision.classification,
  };
}

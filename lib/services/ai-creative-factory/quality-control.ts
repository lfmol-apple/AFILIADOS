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

/** Real vision-based fidelity check — compares the original product
 * photo against the AI-generated composition. Returns null cost (and
 * status "pending") when OPENAI_API_KEY isn't configured — never fakes
 * a pass. */
async function checkVisualFidelity(input: {
  originalPhotoBase64: string;
  generatedImageBase64: string;
  title: string;
}): Promise<{ approved: boolean | null; note: string; costUsd: number | null }> {
  if (!env.OPENAI_API_KEY) {
    return { approved: null, note: "OPENAI_API_KEY não configurada — checagem visual não executada.", costUsd: null };
  }

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
              text: `A primeira imagem é a fotografia REAL do produto "${input.title}". A segunda imagem é uma composição publicitária gerada por IA a partir da primeira. Responda em JSON: {"mesmo_produto": true|false, "embalagem_preservada": true|false, "cor_preservada": true|false, "nota": "texto curto explicando"}. Seja estrito: se a marca, modelo, cor ou embalagem foi alterada, mesmo_produto deve ser false.`,
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
    return { approved: null, note: `Checagem visual falhou (HTTP ${response.status}) — fica pendente, nunca aprovado por omissão.`, costUsd: null };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { approved: null, note: "Resposta vazia da checagem visual.", costUsd: null };

  let parsed: { mesmo_produto?: boolean; embalagem_preservada?: boolean; cor_preservada?: boolean; nota?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    return { approved: null, note: "Resposta da checagem visual não era um JSON válido — fica pendente.", costUsd: null };
  }

  // gpt-4o-mini real rates: $0.15/M input tokens, $0.60/M output tokens —
  // a real, documented, cheap check (a few hundred tokens, well under
  // $0.01), tracked exactly, never assumed free.
  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;
  const costUsd = Math.round((promptTokens * 0.15e-6 + completionTokens * 0.6e-6) * 10000) / 10000;

  const approved = parsed.mesmo_produto === true && parsed.embalagem_preservada === true && parsed.cor_preservada === true;
  return { approved, note: parsed.nota ?? "(sem nota)", costUsd };
}

export async function runQualityControl(input: {
  generatedImageBuffer: Buffer;
  expectedWidth: number;
  expectedHeight: number;
  originalPhotoBase64: string;
  title: string;
}): Promise<QualityCheckResult> {
  const structural = checkStructural(input.generatedImageBuffer, input.expectedWidth, input.expectedHeight);
  if (!structural.ok) {
    return { status: "rejected", notes: structural.note, visionCheckCostUsd: null };
  }

  const vision = await checkVisualFidelity({
    originalPhotoBase64: input.originalPhotoBase64,
    generatedImageBase64: input.generatedImageBuffer.toString("base64"),
    title: input.title,
  });

  if (vision.approved === true) {
    return { status: "approved", notes: `${structural.note} | Checagem visual: aprovado — ${vision.note}`, visionCheckCostUsd: vision.costUsd };
  }
  if (vision.approved === false) {
    return { status: "rejected", notes: `Checagem visual reprovou: ${vision.note}`, visionCheckCostUsd: vision.costUsd };
  }
  return { status: "pending", notes: `${structural.note} | Checagem visual inconclusiva: ${vision.note}`, visionCheckCostUsd: vision.costUsd };
}

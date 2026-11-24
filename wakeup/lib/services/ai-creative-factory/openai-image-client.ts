import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { checkCreativeBudget } from "@/lib/services/ai-creative-factory/budget";

export class OpenAiImageNotConfiguredError extends Error {}

/** Real incident, 2026-11-20: an "isolated" pipeline test, pointed at an
 * empty test database, silently made US$1.45 of real OpenAI calls —
 * the real API key is shared with production no matter which database
 * answers `checkCreativeBudget()`, so a DB-only check was never a real
 * boundary. This error (and the mode gate below) is the real one: it
 * throws before any network request is built, regardless of what any
 * caller already checked. */
export class CreativeGenerationBlockedError extends Error {}

/** Per-process call counter for "piloto_autorizado" mode — intentionally
 * NOT persisted anywhere: it only needs to survive one process's
 * lifetime (one script run, one job invocation), and a fresh process
 * starting back at 0 is the safe direction for a counter whose whole
 * job is capping spend, never the dangerous one. */
let pilotCallsMadeThisProcess = 0;

async function assertCreativeGenerationAllowed(): Promise<void> {
  const mode = env.VITRINE_CREATIVE_MODE;
  if (mode === "teste") {
    throw new CreativeGenerationBlockedError(
      "VITRINE_CREATIVE_MODE=teste (ou não definido) — nenhuma chamada paga à OpenAI é permitida neste processo. " +
        "Defina VITRINE_CREATIVE_MODE=piloto_autorizado (com VITRINE_CREATIVE_PILOT_MAX_CALLS) ou =producao para gerar de verdade.",
    );
  }
  if (mode === "piloto_autorizado") {
    const max = env.VITRINE_CREATIVE_PILOT_MAX_CALLS;
    if (pilotCallsMadeThisProcess >= max) {
      throw new CreativeGenerationBlockedError(
        `Modo piloto_autorizado: limite de ${max} chamada(s) para este processo já atingido (${pilotCallsMadeThisProcess} feita(s)). ` +
          "Aumente VITRINE_CREATIVE_PILOT_MAX_CALLS apenas com nova autorização explícita.",
      );
    }
    pilotCallsMadeThisProcess += 1;
    return;
  }
  // mode === "producao": defense-in-depth — re-checked here even though
  // every real caller (jobs/vitrine-creative-factory.ts, the test/pilot
  // scripts) already calls checkCreativeBudget() itself. This function,
  // not any caller, is the one place that can never be skipped.
  const budget = await checkCreativeBudget();
  if (!budget.allowed) {
    throw new CreativeGenerationBlockedError(`Orçamento real excedido (checagem interna): ${budget.reason}`);
  }
}

/**
 * Real OpenAI Images API client (owner's authorization, 2026-11-19:
 * "integre... à API oficial... não utilize automação da interface do
 * ChatGPT"). Raw `fetch` against the documented REST endpoint, same
 * style this project already uses for Meta/ML (no SDK dependency) —
 * confirmed via OpenAI's own docs, 2026-11-19: `POST /v1/images/edits`,
 * multipart form with `image[]` (the real product photo) + `prompt`.
 *
 * Real, documented per-image pricing for gpt-image-2 (the default model —
 * see env.ts), confirmed from OpenAI's official pricing table the same
 * day: low/medium/high at 1024x1024, 1024x1536 (portrait),
 * 1536x1024 (landscape). A model swap to Sunburst/Flare (token-based
 * pricing) would need its own cost function — intentionally not
 * supported here yet, so cost is never silently wrong.
 */
const GPT_IMAGE_2_PRICE_USD: Record<string, Record<string, number>> = {
  low: { "1024x1024": 0.006, "1024x1536": 0.005, "1536x1024": 0.005 },
  medium: { "1024x1024": 0.053, "1024x1536": 0.041, "1536x1024": 0.041 },
  high: { "1024x1024": 0.211, "1024x1536": 0.165, "1536x1024": 0.165 },
};

export interface GenerateCreativeResult {
  imageBuffer: Buffer;
  costUsd: number;
  model: string;
  size: string;
  quality: string;
}

function isConfigured(): boolean {
  return env.OPENAI_API_KEY.length > 0;
}

export function assertOpenAiConfigured(): void {
  if (!isConfigured()) {
    throw new OpenAiImageNotConfiguredError(
      "OPENAI_API_KEY não configurada — a Fábrica de Criativos está desabilitada até que uma chave real seja fornecida.",
    );
  }
}

/** The AI generation target size — close to the final 1080x1350 (4:5)
 * spec but a real size OpenAI's API accepts for gpt-image-2 portrait
 * output; compositor.ts does the final precise resize/crop to exactly
 * 1080x1350, never the AI call itself (owner's hybrid-architecture
 * requirement, section 5: precision belongs to the programmatic layer). */
export const AI_GENERATION_SIZE = "1024x1536";

export async function generateCreativeBase(input: {
  productPhoto: Buffer;
  productPhotoContentType: string;
  prompt: string;
  /** Owner's directive, 2026-11-20 ("Calibração Visual da Fábrica de
   * Criativos com as Artes do Henrique"): a real, approved creative he
   * already produced, sent as a SECOND reference image so the model
   * matches its real visual style directly — never a style guess typed
   * out by us in prose. Optional: most calls still send only the
   * product photo. */
  styleReferencePhoto?: Buffer;
  styleReferencePhotoContentType?: string;
}): Promise<GenerateCreativeResult> {
  await assertCreativeGenerationAllowed();
  assertOpenAiConfigured();

  const quality = env.VITRINE_CREATIVE_QUALITY === "auto" ? "medium" : env.VITRINE_CREATIVE_QUALITY;
  const model = env.OPENAI_IMAGE_MODEL;

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", input.prompt);
  form.append("size", AI_GENERATION_SIZE);
  form.append("quality", quality);
  form.append("n", "1");
  form.append(
    "image[]",
    new Blob([new Uint8Array(input.productPhoto)], { type: input.productPhotoContentType }),
    "product.jpg",
  );
  if (input.styleReferencePhoto) {
    form.append(
      "image[]",
      new Blob([new Uint8Array(input.styleReferencePhoto)], { type: input.styleReferencePhotoContentType ?? "image/png" }),
      "style-reference.png",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error("ai_creative_factory.openai_edit_failed", { status: response.status, body: body.slice(0, 500) });
    throw new Error(`OpenAI Images Edit API failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = payload.data?.[0];
  if (!first) throw new Error("OpenAI Images Edit API returned no image data.");

  let imageBuffer: Buffer;
  if (first.b64_json) {
    imageBuffer = Buffer.from(first.b64_json, "base64");
  } else if (first.url) {
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Failed to download generated image: HTTP ${imgRes.status}`);
    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error("OpenAI Images Edit API response had neither b64_json nor url.");
  }

  const costUsd =
    model === "gpt-image-2"
      ? GPT_IMAGE_2_PRICE_USD[quality]?.[AI_GENERATION_SIZE] ?? GPT_IMAGE_2_PRICE_USD.medium[AI_GENERATION_SIZE]!
      : (() => {
          logger.warn("ai_creative_factory.unknown_model_cost", { model });
          return GPT_IMAGE_2_PRICE_USD.high[AI_GENERATION_SIZE]!; // conservative overestimate when the model isn't gpt-image-2
        })();

  return { imageBuffer, costUsd, model, size: AI_GENERATION_SIZE, quality };
}

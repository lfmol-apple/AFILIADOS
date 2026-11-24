import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";
import { generateCreativeBase, type GenerateCreativeResult } from "@/lib/services/ai-creative-factory/openai-image-client";

/**
 * Generalization of `scripts/pilot-henrique-style.ts` (owner's directive,
 * 2026-11-21: "o pilot-result-3 é nossa referência oficial... generalize
 * para funcionar automaticamente com qualquer produto elegível"). The
 * pilot proved, across 3 real categories, that a SINGLE paid call —
 * product photo + one of Henrique's own real approved ads as a loose
 * structural anchor + a prompt built from verified product facts — makes
 * the AI draw the whole commercial piece (title, benefit badges, price,
 * Mercado Livre banner/CTA) at a quality the hybrid "AI draws scenario
 * only, code composes the rest" architecture (jobs/vitrine-creative-
 * factory.ts's CURRENT ad_overlay path, compositor.tsx) never matched —
 * confirmed by the owner rejecting that hybrid result directly.
 *
 * This module is the ONLY place `ad_overlay` generation should happen
 * going forward (see vitrine-creative-factory.ts's integration). It is
 * new code, not yet wired to the paid endpoint by anything that runs
 * automatically — wiring + a real paid call both need separate
 * authorization (owner's explicit rule, 2026-11-21: "não gere novas
 * imagens, não faça chamadas pagas" in this same step).
 */

export class OneShotReferenceMissingError extends Error {}

/** Owner's directive, 2026-11-21 ("não permita que a simples mudança de
 * mecanismo provoque automaticamente 30 gerações pagas... migração
 * progressiva, começando com um único produto autorizado"): a gate
 * SEPARATE from VITRINE_CREATIVE_MODE — that one decides if ANY paid
 * call may happen; this one decides WHICH specific product may make
 * one, via a real Mercado Livre externalId allowlist plus a hard
 * per-process call ceiling. Thrown before the reference-file check and
 * before any network request, same fail-closed posture as the rest of
 * this file. */
export class OneShotMigrationNotAuthorizedError extends Error {}

let migrationCallsMadeThisProcess = 0;

function assertMigrationAuthorized(externalId: string): void {
  const allowlist = env.VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!allowlist.includes(externalId)) {
    throw new OneShotMigrationNotAuthorizedError(
      `Produto ${externalId} não está em VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST — migração/geração one-shot não autorizada para ele ainda.`,
    );
  }
  const max = env.VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS;
  if (migrationCallsMadeThisProcess >= max) {
    throw new OneShotMigrationNotAuthorizedError(
      `Limite de migração (VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS=${max}) já atingido neste processo (${migrationCallsMadeThisProcess} feita(s)).`,
    );
  }
  migrationCallsMadeThisProcess += 1;
}

export interface OneShotAdInput {
  /** The real Mercado Livre externalId — checked against the migration
   * allowlist before anything else in this module runs. */
  externalId: string;
  /** Real, verified facts only — never inferred or invented beyond what
   * the caller already confirmed (interpretProduct(), the real listing,
   * the real price pipeline). */
  title: string;
  brand: string | null;
  productPhoto: Buffer;
  productPhotoContentType: string;
  currentPrice: number;
  /** Null when no real prior price is confirmed — the prompt then omits
   * the crossed-out price entirely rather than fabricating a discount. */
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
  /** 0-3 short, REAL benefit facts (e.g. "550W DE POTÊNCIA") — same
   * source as the hybrid architecture already uses (interpretProduct()),
   * never a generic/invented claim. */
  benefits: string[];
  /** Real category-driven art direction, same source as the hybrid
   * architecture (interpretProduct()'s CreativeProfile.backgroundStyle/
   * colorPalette/ambientation). Owner's directive, 2026-11-21 ("o fundo
   * saiu claro e genérico; a referência aprovada tem profundidade e
   * ambientação profissional"): when provided, these replace the old
   * generic "escolha uma paleta adequada" instruction with the SAME
   * concrete category direction the rest of the factory already
   * computes, instead of leaving the model to default to a flat studio
   * backdrop. Optional only so existing callers/tests that don't pass
   * them keep working — the generic fallback instruction still forbids a
   * flat/generic result. */
  backgroundStyle?: string;
  colorPalette?: string;
  ambientation?: string;
}

export interface OneShotAdResult extends GenerateCreativeResult {
  promptText: string;
  /** The exact price values baked into the generated pixels — stored so
   * a later price change can be detected (see `isBakedPriceStale`) rather
   * than silently serving an image with the wrong price on it. */
  bakedCurrentPrice: number;
  bakedReferencePrice: number | null;
}

interface StyleReference {
  buffer: Buffer;
  contentType: string;
}

/** Loads the real Henrique reference art from the bundled, versioned
 * path (see env.ts's doc comment) — never a path on the owner's own Mac,
 * so this works identically in the Docker image. Missing file is a HARD
 * STOP (owner's explicit rule, 2026-11-21: "elimine a possibilidade de a
 * fábrica voltar silenciosamente ao compositor antigo... deve falhar de
 * maneira segura") — the caller must never catch this and fall back to
 * the old compositor.tsx path for a NEW generation. */
function loadHenriqueStyleReference(): StyleReference {
  const configuredPath = env.VITRINE_HENRIQUE_STYLE_REFERENCE_PATH;
  const resolved = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  if (!existsSync(resolved)) {
    throw new OneShotReferenceMissingError(
      `Referência visual do Henrique não encontrada em "${resolved}" (VITRINE_HENRIQUE_STYLE_REFERENCE_PATH). ` +
        "O mecanismo aprovado (pilot-result-3) não pode gerar sem ela — isto é intencional, nunca cai de volta no compositor antigo.",
    );
  }
  return { buffer: readFileSync(resolved), contentType: "image/png" };
}

/** Bottom-edge safety margin — real bug found live, 2026-11-24: the
 * prompt used to tell the model "this will be cropped to 4:5 afterward,
 * leave the top/bottom empty", a premise from an earlier architecture
 * that no longer applies (confirmed by reading this file and
 * openai-image-client.ts end to end: neither calls any image-processing
 * library — there is no crop step, the raw 1080x1350 generation IS the
 * final asset). Telling the model about a crop that never happens made
 * it place the Mercado Livre banner right at the literal bottom edge
 * (own observation: the CTA button text was visibly cut off in the
 * delivered asset), since it had no reason to think the edge mattered.
 * Fixed to ask for a real, modest margin instead of a false premise. */
const BOTTOM_SAFE_MARGIN_PERCENT = 6;

/** Mirrors `pilot-henrique-style.ts`'s real, owner-approved prompt
 * structure, but every product-specific line is now built from real
 * input data instead of hand-typed per pilot. The RULES (reference as
 * loose structural anchor only; preserve the real product exactly; no
 * invented rating/sales/urgency/extra objects; real ML banner + CTA;
 * crop-safety margin) are copied verbatim in spirit — this is a
 * generalization, not a rewrite of what was proven to work. */
export function buildOneShotPrompt(input: OneShotAdInput): string {
  const benefitLines =
    input.benefits.length > 0
      ? `- De ${Math.min(input.benefits.length, 3)} ${input.benefits.length === 1 ? "ícone" : "ícones"} (em quadrados coloridos com cantos arredondados) ao lado de um rótulo curto, cada um desenhando literalmente um benefício real e já confirmado: ${input.benefits
          .slice(0, 3)
          .map((b) => `"${b}"`)
          .join(", ")}. Rótulo curto de 2-4 palavras ao lado de cada ícone.`
      : "- Não inclua ícones de benefício — nenhum benefício real e verificado está disponível para este produto; não invente um.";

  const priceLine =
    input.hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice
      ? `- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ ${input.currentPrice.toFixed(2).replace(".", ",")}", e menor e riscado o preço anterior real "R$ ${input.referencePrice.toFixed(2).replace(".", ",")}".`
      : `- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ ${input.currentPrice.toFixed(2).replace(".", ",")}". Não inclua nenhum preço anterior riscado — não há desconto real confirmado para este produto.`;

  // Owner's directive, 2026-11-21: the approved pilot's dark, textured,
  // professional-looking background is part of what made it look like a
  // real ad — a flat generic "estúdio" backdrop is a regression. When the
  // caller provides the same category direction the rest of the factory
  // already computes (interpretProduct()), use it concretely; otherwise
  // fall back to an instruction that still forbids the flat/generic look.
  const ambientationLine =
    input.backgroundStyle && input.colorPalette && input.ambientation
      ? `Fundo e ambientação: ${input.backgroundStyle}. Paleta de cores: ${input.colorPalette}. Sensação geral: ${input.ambientation}. O fundo deve ter profundidade real (textura, iluminação, contexto), como no anúncio aprovado de referência — nunca um fundo liso e genérico de "estúdio plano" sem contexto, a menos que a direção acima peça explicitamente um fundo clean e claro.`
      : `Escolha uma paleta de cores e ambientação adequadas à categoria real deste produto, combinando com as cores reais vistas na foto, com sensação prática e profissional e com profundidade real de fundo (textura, iluminação, contexto) — nunca um fundo liso e genérico de "estúdio plano" sem contexto algum.`;

  return [
    `Crie um anúncio publicitário comercial vertical para Instagram/Facebook. Use a segunda imagem fornecida (uma arte real já aprovada do Henrique) apenas como referência ESTRUTURAL solta: tipografia bold em destaque, ícones dentro de quadrados coloridos com cantos arredondados, cada um ao lado de um rótulo curto de 2 linhas. Não copie o produto, a marca, as cores específicas ou o layout exato dessa referência — ela só mostra o PADRÃO DE QUALIDADE esperado.`,
    ``,
    `O produto real está na PRIMEIRA imagem fornecida: "${input.title}"${input.brand ? `, marca ${input.brand}` : ""}. Preserve o produto exatamente como aparece na foto — mesma cor, formato e proporções reais. Não redesenhe nem altere o produto.`,
    ``,
    `${ambientationLine} Inclua:`,
    `- Título do produto em destaque, bold, duas linhas, duas cores.`,
    benefitLines,
    `- Produto grande e centralizado, ocupando a maior parte da composição.`,
    priceLine,
    `- No rodapé, uma faixa amarela horizontal com o logotipo real do Mercado Livre (ícone de aperto de mãos) e um botão azul-marinho arredondado "Compre agora no Mercado Livre".`,
    ``,
    `Não invente avaliação, quantidade vendida ou certificação — não há dado real disponível para isso, então NÃO inclua nenhuma menção a nota ou vendas. Não use "últimas unidades" ou qualquer urgência artificial. Não adicione nenhum objeto, produto, embalagem, acessório, brinde ou item extra que não esteja fisicamente presente na foto original do produto.`,
    ``,
    `Linguagem do texto do anúncio: nunca escreva no anúncio palavras ou expressões que soem como processo de validação interna — por exemplo "real", "reais no anúncio", "confirmado", "verificado", "extraído do título", "validado", "comprovado". Escreva como um anúncio comercial de verdade, direto e atraente (ex.: "550 W de potência", "Reservatório de 800 ml", "39% OFF", "Economize R$ 147,80"). Os valores numéricos devem ser exatamente os fornecidos acima — nunca calcule, arredonde de forma diferente ou invente um novo número.`,
    ``,
    `IMPORTANTE sobre enquadramento: esta é a imagem FINAL, ela NÃO será cortada depois — tudo que você desenhar permanece exatamente como está. Por isso, é essencial que NENHUM elemento toque ou ultrapasse a borda da imagem. Deixe uma margem vazia real de pelo menos ${BOTTOM_SAFE_MARGIN_PERCENT}% da altura total, sem nenhum elemento, entre a parte de baixo da faixa amarela do Mercado Livre e a borda inferior da imagem — a faixa inteira, incluindo o texto completo do botão "Compre agora no Mercado Livre", deve estar 100% visível, com folga real abaixo dela, nunca encostada ou cortada na borda. O mesmo vale pra borda superior: deixe uma margem real acima do título.`,
  ].join("\n");
}

/** Tag stored in `VitrineCreative.promptInputs.mechanism` for every row
 * this module produces — lets the factory job tell a one-shot row apart
 * from one produced by the old "AI scenario + compositor.tsx overlay"
 * hybrid, so an existing legacy row always counts as needing
 * regeneration exactly once (owner's directive, 2026-11-21: never keep
 * serving the old, rejected visual style). */
export const ONE_SHOT_MECHANISM_TAG = "one_shot_v1";

export interface AdOverlayRegenerationCheckInput {
  hasExistingRow: boolean;
  existingQualityStatus: "approved" | "rejected" | "pending" | null;
  /** `promptInputs.mechanism` of the latest existing row, or null for a
   * legacy/pre-one-shot row (or no row at all). */
  existingMechanism: string | null;
  categoryChanged: boolean;
  eventChanged: boolean;
  priceStale: boolean;
}

/** Pure decision function for whether `ad_overlay` needs a real
 * regeneration — extracted so the mechanism-selection logic (the exact
 * thing the owner does not want silently regressing back to the old
 * compositor) is unit-testable without a database. The factory job
 * calls this instead of inlining the boolean checks. */
export function shouldRegenerateAdOverlay(input: AdOverlayRegenerationCheckInput): boolean {
  if (!input.hasExistingRow) return true;
  if (input.existingQualityStatus === "rejected") return true;
  if (input.existingMechanism !== ONE_SHOT_MECHANISM_TAG) return true;
  if (input.categoryChanged || input.eventChanged) return true;
  if (input.priceStale) return true;
  return false;
}

/** A price change makes a one-shot image's BAKED price wrong — there is
 * no code-only fix (owner's explicit rule, 2026-11-21: "não sobreponha
 * automaticamente novos preços... não permita publicar arte com preço
 * desatualizado"). The caller (vitrine-creative-factory.ts) uses this to
 * decide the creative needs a real regeneration, never a silent reuse. */
export function isBakedPriceStale(input: {
  bakedCurrentPrice: number;
  bakedReferencePrice: number | null;
  liveCurrentPrice: number;
  liveReferencePrice: number | null;
}): boolean {
  return input.bakedCurrentPrice !== input.liveCurrentPrice || input.bakedReferencePrice !== input.liveReferencePrice;
}

export async function generateOneShotAd(input: OneShotAdInput): Promise<OneShotAdResult> {
  // Checked BEFORE anything else: controlled, progressive rollout — a
  // real product can use (or migrate to) the one-shot mechanism only if
  // explicitly allowlisted, regardless of what VITRINE_CREATIVE_MODE or
  // the dollar budget would otherwise allow.
  assertMigrationAuthorized(input.externalId);
  // Thrown BEFORE the paid call — missing reference art must never burn
  // budget on a generation we already know can't match the approved style.
  const styleRef = loadHenriqueStyleReference();
  const promptText = buildOneShotPrompt(input);

  const generation = await generateCreativeBase({
    productPhoto: input.productPhoto,
    productPhotoContentType: input.productPhotoContentType,
    prompt: promptText,
    styleReferencePhoto: styleRef.buffer,
    styleReferencePhotoContentType: styleRef.contentType,
  });

  return {
    ...generation,
    promptText,
    bakedCurrentPrice: input.currentPrice,
    bakedReferencePrice: input.hasConfirmedDiscount ? input.referencePrice : null,
  };
}

/** Owner's directive, 2026-11-21 ("proponha uma política que considere
 * frequência das mudanças, orçamento... validade do preço"): a PAID
 * regeneration attempt triggered by price staleness alone is debounced
 * — unpublishing the wrong-priced image is never throttled (see the
 * job's own unconditional unpublish-on-stale logic), only the money
 * spent trying to fix it is. Uses the existing `generatedAt` of the
 * latest ad_overlay row as the "last real attempt" signal — no schema
 * change needed. Returns true (attempt now) when there has never been
 * an attempt, or enough time has passed since the last one. */
export function shouldAttemptPriceRegenerationNow(input: {
  lastAttemptAt: Date | null;
  now: Date;
  minIntervalHours: number;
}): boolean {
  if (!input.lastAttemptAt) return true;
  const hoursSinceLastAttempt = (input.now.getTime() - input.lastAttemptAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastAttempt >= input.minIntervalHours;
}

export interface RegenerationCandidate {
  merchantListingId: string;
  /** The real commercial score already computed by the selection engine
   * (VitrineSelection.score) — never a new, separate priority metric. */
  score: number;
}

/** Owner's directive, 2026-11-21 ("prioridade comercial"): when more
 * products need a real paid regeneration in one cycle than the
 * migration/budget ceiling allows, the higher-score (more commercially
 * promising) products go first — never an arbitrary or insertion order.
 * Pure and stable-sorted (ties keep their original relative order) so
 * it's fully deterministic and testable without a database. */
export function prioritizeRegenerationCandidates(candidates: RegenerationCandidate[], maxCount: number): RegenerationCandidate[] {
  return [...candidates]
    .map((c, index) => ({ c, index }))
    .sort((a, b) => b.c.score - a.c.score || a.index - b.index)
    .slice(0, maxCount)
    .map(({ c }) => c);
}

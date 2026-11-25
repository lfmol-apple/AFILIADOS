import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";
import { generateCreativeBase, AI_GENERATION_SIZE, type GenerateCreativeResult } from "@/lib/services/ai-creative-factory/openai-image-client";
import { CTA_BAR_HEIGHT_FRACTION, CREATIVE_FINAL_DIMENSIONS } from "@/lib/services/ai-creative-factory/compositor";

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

/** Real root cause history, CTA bar clipping, 2026-11-24 — three attempts
 * before landing on the real fix:
 *  1. Commit 405fd17 diagnosed it as "the model thinks this gets cropped,
 *     tell it the truth" and asked for an empty bottom margin. Wrong
 *     diagnosis: direct comparison against the real owner-approved
 *     reference (data/vitrine-creative-reference/henrique-style-
 *     reference.png) shows the bar flush against the literal bottom
 *     edge, zero margin — that IS the approved style. Confirmed NOT
 *     fixed on a real production asset the same day.
 *  2. A same-day rewrite asked for a FIT guarantee instead (bar tall
 *     enough for both lines of logo + both lines of button text) — a
 *     correct diagnosis, but still just a prompt request, which the
 *     owner explicitly rejected as a definitive fix ("não apenas um
 *     texto de prompt") after seeing it applied to no real generation.
 *  3. The actual fix: the bar is no longer drawn by the AI at all. It is
 *     composited deterministically from the real, measured approved
 *     asset (compositor.ts's compositeDeterministicCtaBar(),
 *     CTA_BAR_HEIGHT_FRACTION = 0.12625, wired into jobs/vitrine-
 *     creative-factory.ts) — pixel-identical every time, zero geometric
 *     or content freedom for the model over that region. The prompt
 *     below now tells the model NOT to draw this element at all.
 *  4. Owner's directive, 2026-11-24 ("siga o exemplo do Henrique"),
 *     found on a SEPARATE branch the same day: step 1's "no crop
 *     happens" claim was itself wrong, discovered by actually validating
 *     with two real paid generations and replaying the real pipeline on
 *     each. jobs/vitrine-creative-factory.ts always runs the raw
 *     AI_GENERATION_SIZE (1024x1536) output through `renderCatalogClean`
 *     BEFORE this deterministic bar is ever composited — a real,
 *     automatic, centered `object-fit: cover` crop into
 *     CREATIVE_FINAL_DIMENSIONS (1080x1350). The two fixes compose: the
 *     crop removes real content from the top and bottom of whatever the
 *     model draws; the deterministic bar then separately overwrites the
 *     bottom CTA_BAR_HEIGHT_FRACTION of what SURVIVES that crop. Both
 *     real constraints are computed below from the actual constants
 *     (never a hand-typed guess) so this can never again silently drift
 *     out of sync with the real pipeline the way 405fd17 did. */

/** Deterministic derivation of the real safety margins, expressed in RAW
 * generation-canvas percent (what the prompt actually asks the model to
 * reason about) — never a hand-typed number, so a future change to
 * AI_GENERATION_SIZE, CREATIVE_FINAL_DIMENSIONS or CTA_BAR_HEIGHT_FRACTION
 * automatically keeps these margins correct instead of silently going
 * stale like the 405fd17 regression did. */
const [RAW_GENERATION_WIDTH, RAW_GENERATION_HEIGHT] = AI_GENERATION_SIZE.split("x").map(Number) as [number, number];
/** `object-fit: cover` scales by the LARGER of the two ratios so the
 * final box is fully covered with no letterboxing — confirmed by reading
 * compositor.tsx's actual renderCatalogClean, not assumed. */
const COVER_SCALE = Math.max(CREATIVE_FINAL_DIMENSIONS.width / RAW_GENERATION_WIDTH, CREATIVE_FINAL_DIMENSIONS.height / RAW_GENERATION_HEIGHT);
const SCALED_RAW_HEIGHT = RAW_GENERATION_HEIGHT * COVER_SCALE;
/** Fraction of the RAW canvas's height the cover-crop removes from EACH
 * edge (top and bottom equally, since the crop is centered). */
const CROP_FRACTION_PER_EDGE = (SCALED_RAW_HEIGHT - CREATIVE_FINAL_DIMENSIONS.height) / 2 / COVER_SCALE / RAW_GENERATION_HEIGHT;
/** Fraction of the RAW canvas's height the deterministic Mercado Livre
 * bar's reserved band occupies, once that band (measured against the
 * FINAL cropped canvas) is converted back into raw-canvas terms. */
const RESERVED_BAR_FRACTION_OF_RAW = (CTA_BAR_HEIGHT_FRACTION * CREATIVE_FINAL_DIMENSIONS.height) / COVER_SCALE / RAW_GENERATION_HEIGHT;
/** Top edge only ever loses the crop — reuse the exact 18% the owner's
 * own approved reference (pilot-result-3) was generated with (comfortably
 * above the real ~8.3% crop) rather than inventing a new "minimum". */
export const TOP_SAFE_MARGIN_PERCENT = 18;
/** Bottom edge loses BOTH the crop AND the reserved bar band — real
 * minimum is CROP_FRACTION_PER_EDGE + RESERVED_BAR_FRACTION_OF_RAW
 * (≈18.9% today). Rounded up plus a real safety buffer, same spirit as
 * the top margin rather than shipping a bare minimum. */
const BOTTOM_SAFE_MARGIN_PERCENT = Math.ceil((CROP_FRACTION_PER_EDGE + RESERVED_BAR_FRACTION_OF_RAW) * 100) + 6;

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

  const hasRealDrop = input.hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice;
  const priceLine = hasRealDrop
    ? `- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ ${input.currentPrice.toFixed(2).replace(".", ",")}", e menor e riscado o preço anterior real "R$ ${input.referencePrice!.toFixed(2).replace(".", ",")}".`
    : `- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ ${input.currentPrice.toFixed(2).replace(".", ",")}". Preço normal, sem nenhuma indicação de desconto (ver aviso crítico abaixo).`;

  /** Real failure, 2026-11-24 (confirmed via quality-control rejection
   * notes on a live production run): the single bullet point above
   * telling the model "não inclua preço riscado" was NOT enough — the
   * model invented a discount badge/percentage for a product with no
   * confirmed discount anyway. A bullet buried mid-list is easy for an
   * image model to deprioritize against its own trained instinct to draw
   * a discount next to a price (a near-universal ad convention it has
   * seen far more of in training than this specific prohibition). Fixed
   * by promoting this into its own loud, repeated, standalone warning
   * paragraph instead of one bullet among many — never softened, never
   * removed even if it reads as repetitive. */
  const noDiscountWarning = !hasRealDrop
    ? `AVISO CRÍTICO — ESTE PRODUTO NÃO TEM DESCONTO: não existe desconto real confirmado para este produto. Isso significa, sem exceção: NENHUM selo "% OFF", NENHUMA porcentagem de desconto, NENHUM preço riscado/anterior, NENHUMA palavra "antes" ou "de R$X" com valor diferente do preço atual, NENHUM selo ou faixa de "promoção"/"oferta"/"liquidação". O preço R$ ${input.currentPrice.toFixed(2).replace(".", ",")} é o preço normal do produto, mostrado sozinho, sem nenhum elemento visual de desconto ao redor dele.`
    : null;

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
    /** Real gap found live, 2026-11-24 (owner's directive, "resolva
     * tudo"): a product whose own source photo includes a human model
     * (seller stock photos for fitness/beauty categories commonly do)
     * kept that model in the generated ad, producing a lifestyle-photo
     * layout that diverges from the approved product-still template — no
     * instruction here ever told the model to remove it. This is not a
     * new rule: quality-control.ts's vision check has always treated a
     * human model's removal as a legitimate, expected ambientation
     * change, never a defect ("regra deliberada deste projeto, nunca um
     * erro") — the generation prompt just never actually asked for it. */
    `Se a foto original do produto incluir uma pessoa ou modelo humano segurando, vestindo ou demonstrando o produto, NÃO inclua essa pessoa na composição final — mostre apenas o produto em si, isolado ou em um cenário de contexto (sem gente), mesmo que a foto original tenha uma pessoa. Esta é uma remoção deliberada e esperada, não um erro.`,
    ``,
    `${ambientationLine} Inclua:`,
    `- Título do produto em destaque, bold, duas linhas, duas cores.`,
    benefitLines,
    `- Produto grande e centralizado, ocupando a maior parte da composição.`,
    priceLine,
    /** Owner's directive, 2026-11-24 ("quer um corte determinístico, não
     * apenas um texto de prompt"): the Mercado Livre CTA bar is no longer
     * the AI's job at all — it's composited afterward, pixel-identical
     * every time, from the real approved asset (compositor.ts's
     * compositeDeterministicCtaBar, wired in jobs/vitrine-creative-
     * factory.ts). Two prompt attempts to get the AI to draw this bar
     * correctly (commit 405fd17's margin-based fix, then a fit-based
     * rewrite the same day) both failed on a real production asset — the
     * geometrically reliable fix is to stop asking the model to draw it
     * at all, never to keep refining the request. This replaces the old
     * "draw the ML bar" bullet.
     */
    `- NÃO desenhe nenhuma faixa, logotipo, botão ou menção ao Mercado Livre no rodapé da imagem — esse elemento é adicionado automaticamente por cima da imagem depois, de forma determinística (não é seu trabalho).`,
    ``,
    `Não adicione nenhum ícone, selo ou badge além dos exatamente listados acima (os ícones de benefício e o selo de preço). Em especial, NÃO desenhe um selo ou ícone separado de desconto em percentual (como um círculo ou quadrado com "X% OFF" ou "economize R$ ...") mesmo quando o produto tem desconto real — essa informação já existe dentro do próprio selo de preço, como o preço riscado, e não deve virar um segundo elemento visual. Um elemento a mais do que o pedido é exatamente o tipo de erro que espreme o resto da composição contra as bordas.`,
    ``,
    `Não invente avaliação, quantidade vendida ou certificação — não há dado real disponível para isso, então NÃO inclua nenhuma menção a nota ou vendas. Não use "últimas unidades" ou qualquer urgência artificial. Não adicione nenhum objeto, produto, embalagem, acessório, brinde ou item extra que não esteja fisicamente presente na foto original do produto.`,
    ``,
    `Linguagem do texto do anúncio: nunca escreva no anúncio palavras ou expressões que soem como processo de validação interna — por exemplo "real", "reais no anúncio", "confirmado", "verificado", "extraído do título", "validado", "comprovado". Escreva como um anúncio comercial de verdade, direto e atraente (ex.: "550 W de potência", "Reservatório de 800 ml"). Os valores numéricos devem ser exatamente os fornecidos acima — nunca calcule, arredonde de forma diferente ou invente um novo número.`,
    noDiscountWarning,
    ``,
    /** The real, combined crop-safety instruction — replaces the old
     * single-fraction "fique dentro dos X% superiores" bullet, which only
     * accounted for the reserved bar band and silently assumed the raw
     * generation IS the final asset (step 4 above: that assumption was
     * false, confirmed by two real validated generations the same day).
     * Both numbers are derived constants, never hand-typed — see their
     * definitions above for the exact math. */
    `IMPORTANTE sobre enquadramento: esta imagem será cortada posteriormente para a proporção final 4:5 (a borda superior e a borda inferior serão removidas antes de qualquer outro processamento). Deixe uma margem vazia, neutra, SEM NENHUM elemento (sem título, sem ícone, sem produto, sem selo de preço) ocupando os ${TOP_SAFE_MARGIN_PERCENT}% superiores da altura total da imagem. Na borda inferior, deixe uma margem vazia ainda maior, de pelo menos ${BOTTOM_SAFE_MARGIN_PERCENT}% da altura total — essa margem maior combina a área que será cortada com a área reservada para o elemento do Mercado Livre adicionado depois (ver instrução acima); nenhum título, ícone, produto ou selo de preço pode se estender para dentro dela.`,
  ].join("\n");
}

/** Tag stored in `VitrineCreative.promptInputs.mechanism` for a row
 * produced by the hybrid pipeline (see `renderHybridTextOverlay` in
 * compositor.tsx) — distinct from ONE_SHOT_MECHANISM_TAG so the factory
 * job and any future audit can always tell which real mechanism drew a
 * given row's text elements: the AI (one_shot_v1) or deterministic code
 * (hybrid_v1). */
export const HYBRID_MECHANISM_TAG = "hybrid_v1";

/** Owner's directive, 2026-11-25 ("Secador Philco — solução
 * definitiva... IA responsável pelo fundo e pela apresentação visual do
 * produto. Código determinístico responsável pelo título, preço, faixa
 * do Mercado Livre e demais elementos comerciais obrigatórios"): real
 * root cause of the Secador failures (two real generations, two real
 * price-badge/reserved-zone violations, see margin-safety-check.ts's
 * calibration data) is that asking an image model to both compose a
 * photo AND typeset commercial text with pixel-perfect margins is two
 * different skills bundled into one unreliable request. This prompt
 * asks for ONLY the first skill — a real product photo, ambientation,
 * nothing else — the text (title/icons/price) is drawn afterward by
 * `renderHybridTextOverlay`, with positions computed from real numbers,
 * never asked for in a sentence.
 *
 * Never a replacement for buildOneShotPrompt — that mechanism still
 * produces the approved, higher-quality result for every product that
 * doesn't need this fallback (the owner's own rejection of the OLD,
 * fully-programmatic hybrid architecture, 2026-11-21, was specifically
 * about assembling the FULL layout from scratch in code — not about
 * code ever touching typography at all). Piloted on one product
 * (Secador Philco) before any wider use. */
export function buildBackgroundOnlyPrompt(input: Pick<OneShotAdInput, "title" | "brand" | "backgroundStyle" | "colorPalette" | "ambientation">): string {
  const ambientationLine =
    input.backgroundStyle && input.colorPalette && input.ambientation
      ? `Fundo e ambientação: ${input.backgroundStyle}. Paleta de cores: ${input.colorPalette}. Sensação geral: ${input.ambientation}. O fundo deve ter profundidade real (textura, iluminação, contexto) — nunca um fundo liso e genérico de "estúdio plano" sem contexto.`
      : `Escolha uma paleta de cores e ambientação adequadas à categoria real deste produto, combinando com as cores reais vistas na foto, com sensação prática e profissional e com profundidade real de fundo (textura, iluminação, contexto) — nunca um fundo liso e genérico de "estúdio plano" sem contexto algum.`;

  return [
    `Crie uma fotografia publicitária de produto, vertical, para Instagram/Facebook. Use a segunda imagem fornecida (uma arte real já aprovada do Henrique) apenas como referência de CLIMA/QUALIDADE FOTOGRÁFICA — nunca copie o produto, a marca, texto ou layout dela.`,
    ``,
    `O produto real está na PRIMEIRA imagem fornecida: "${input.title}"${input.brand ? `, marca ${input.brand}` : ""}. Preserve o produto exatamente como aparece na foto — mesma cor, formato e proporções reais. Não redesenhe nem altere o produto. Se a foto original incluir uma pessoa ou modelo humano, NÃO a inclua na composição final — mostre apenas o produto.`,
    ``,
    `${ambientationLine}`,
    ``,
    `Produto grande e centralizado, ocupando a maior parte da composição, com espaço real de respiro ao redor (não precisa encostar nas bordas).`,
    ``,
    `IMPORTANTE — isto é uma peça puramente fotográfica: NÃO desenhe absolutamente nenhum texto, número, palavra, letra, título, preço, ícone, selo, badge, logotipo, faixa ou qualquer elemento gráfico de interface nesta imagem. Nenhum elemento comercial de qualquer tipo. Apenas o produto real e o fundo/ambientação — todo o texto e os elementos comerciais são adicionados depois, de forma determinística, por código, não por você. Qualquer letra ou número que aparecer nesta imagem (além do que já existe fisicamente escrito no próprio produto, como uma marca gravada) é um defeito grave.`,
    ``,
    `Não invente nem adicione nenhum objeto, produto, embalagem, acessório, brinde ou item extra que não esteja fisicamente presente na foto original do produto.`,
  ].join("\n");
}

export async function generateBackgroundOnly(input: {
  externalId: string;
  title: string;
  brand: string | null;
  productPhoto: Buffer;
  productPhotoContentType: string;
  backgroundStyle?: string;
  colorPalette?: string;
  ambientation?: string;
}): Promise<GenerateCreativeResult & { promptText: string }> {
  // Same real safety gates as generateOneShotAd — a new mechanism is
  // never an excuse to skip the migration allowlist or the financial
  // gate.
  assertMigrationAuthorized(input.externalId);
  const styleRef = loadHenriqueStyleReference();
  const promptText = buildBackgroundOnlyPrompt(input);
  const generation = await generateCreativeBase({
    productPhoto: input.productPhoto,
    productPhotoContentType: input.productPhotoContentType,
    prompt: promptText,
    styleReferencePhoto: styleRef.buffer,
    styleReferencePhotoContentType: styleRef.contentType,
  });
  return { ...generation, promptText };
}

/** Tag stored in `VitrineCreative.promptInputs.mechanism` for every row
 * this module produces — lets the factory job tell a one-shot row apart
 * from one produced by the old "AI scenario + compositor.tsx overlay"
 * hybrid, so an existing legacy row always counts as needing
 * regeneration exactly once (owner's directive, 2026-11-21: never keep
 * serving the old, rejected visual style). */
export const ONE_SHOT_MECHANISM_TAG = "one_shot_v1";

/** Owner's directive, 2026-11-25 ("cada criativo deverá possuir...
 * versão do padrão Henrique"): a single source-of-truth version tag for
 * the APPROVED VISUAL STANDARD itself (docs/henrique-visual-standard/
 * SPEC.md), independent of `mechanism` above (which tracks HOW the
 * pixels were produced — one-shot vs. hybrid — not whether the result
 * follows the approved spec). Bump this, and update SPEC.md to a new
 * version, only on a real, owner-authorized change to the visual
 * standard itself ("nenhuma alteração futura nesse padrão poderá ser
 * feita sem minha autorização expressa e apresentação de comparativo
 * visual") — never silently alongside an unrelated code change. */
export const HENRIQUE_STANDARD_VERSION = "v1";

export interface AdOverlayRegenerationCheckInput {
  hasExistingRow: boolean;
  existingQualityStatus: "approved" | "rejected" | "pending" | null;
  /** `promptInputs.mechanism` of the latest existing row, or null for a
   * legacy/pre-one-shot row (or no row at all). */
  existingMechanism: string | null;
  /** `promptInputs.henriqueStandardVersion` of the latest existing row,
   * or null for a row predating this field (owner's directive,
   * 2026-11-25: version-tag every creative against the approved visual
   * standard). A mismatch here means SPEC.md moved on since this row
   * was drawn — treated exactly like a mechanism mismatch: always worth
   * a real regeneration, never silently served as if still current. */
  existingHenriqueStandardVersion: string | null;
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
  // Real bug caught in this same session, before it ever shipped: unlike
  // `existingMechanism` above (which deliberately treats a legacy/absent
  // value as "always regenerate" — a one-time, intentional migration
  // guard), this field is BRAND NEW — every row in production today
  // genuinely lacks it. Strict inequality here would read as "every
  // existing row is version-mismatched" the moment this ships, forcing
  // a full-catalog regeneration wave on the very next cron cycle —
  // exactly what "impeça ciclos infinitos de regeneração e gastos
  // descontrolados" (owner's directive, 2026-11-25) prohibits. Same
  // "absence is unknown, never evidence of change" treatment as
  // promptFieldChanged uses for categoryHint/isSeasonalEvent: only a
  // row that RECORDED a real, different version is a genuine trigger.
  if (input.existingHenriqueStandardVersion !== null && input.existingHenriqueStandardVersion !== HENRIQUE_STANDARD_VERSION) return true;
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

/** Real root cause, 2026-11-24 (confirmed by reading this exact
 * comparison in jobs/vitrine-creative-factory.ts against a row the
 * owner's own ad-hoc scratch script had created earlier the same week):
 * a row whose `promptInputs` never recorded a given field (because it
 * was written by something other than this factory job) stores that
 * field as `undefined`. A raw `previous !== current` comparison then
 * reads `undefined !== null` (or `undefined !== "some real value"`) as
 * TRUE — "changed" — for every single row like that, forever, even
 * though nothing about the product actually changed. That falsely
 * triggered a full paid regeneration for 6 already-approved, perfectly
 * good creatives in one real production run (~part of a $1.63 round).
 * This treats "the field was never recorded" as genuinely unknown —
 * never evidence of change — which is what "a simples passagem do tempo
 * não deve justificar nova geração" (owner's directive) really requires:
 * silence isn't a signal. Only a previously-RECORDED, concretely
 * different value counts as an objective trigger. */
export function promptFieldChanged(previous: unknown, current: unknown): boolean {
  return previous !== undefined && previous !== current;
}

export interface RejectionCooldownCheckInput {
  /** `generatedAt`/`qualityStatus` of the most recent attempts for this
   * exact (merchantListingId, kind), newest first — only as many as
   * `maxConsecutive` need to be inspected by the caller. */
  recentAttempts: Array<{ qualityStatus: "approved" | "rejected" | "pending"; generatedAt: Date }>;
  maxConsecutive: number;
  cooldownHours: number;
  now: Date;
}

/** Owner's directive, 2026-11-24 ("implemente um limite de tentativas e
 * um período de espera para impedir que o mesmo criativo reprovado
 * consuma dinheiro repetidamente"): before today's fix, a rejected
 * ad_overlay was retried unconditionally on every single cron cycle,
 * forever — `existingQualityStatus === "rejected"` alone always forced a
 * new paid attempt. This counts how many of the most recent attempts, in
 * a row, were rejected; once that streak reaches `maxConsecutive`,
 * further auto-retries are blocked until `cooldownHours` have passed
 * since the LAST attempt in the streak. A single approved attempt (or
 * fewer than `maxConsecutive` existing rows) never blocks anything — the
 * streak must be unbroken and the caller is expected to pass attempts in
 * newest-first order. Pure/testable, no DB access. */
export function shouldSkipDueToRejectionCooldown(input: RejectionCooldownCheckInput): boolean {
  const streak = input.recentAttempts.slice(0, input.maxConsecutive);
  if (streak.length < input.maxConsecutive) return false;
  const allRejected = streak.every((a) => a.qualityStatus === "rejected");
  if (!allRejected) return false;
  const lastAttemptAt = streak[0].generatedAt;
  const hoursSinceLastAttempt = (input.now.getTime() - lastAttemptAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastAttempt < input.cooldownHours;
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

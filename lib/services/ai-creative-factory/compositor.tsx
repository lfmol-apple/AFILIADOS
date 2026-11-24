import { ImageResponse } from "next/og";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";

/**
 * Programmatic precision layer (owner's authorization, 2026-11-19,
 * hybrid architecture, section 5): takes the AI-generated base
 * composition and overlays price/name/CTA with pixel precision, using
 * the SAME `next/og`/Satori technology already validated in this project
 * (lib/services/vitrine-creative.tsx) — no new dependency, no separate
 * image library. This also does the final precise resize/crop from the
 * AI's own output size down to the exact 1080x1350 (4:5) spec, since
 * that too is a "needs exact numbers" concern, not a creative one.
 *
 * "catalog_clean": the AI image alone, no overlay — for the XML feed's
 * cover-media field (Meta's own Advantage+ dynamic overlay draws price
 * on top of this, confirmed via Meta's developer docs the same day).
 * "ad_overlay": the same base, with THIS project's own price/CTA baked
 * in — for manual/Collection ads with no native overlay.
 *
 * Owner's explicit note on the Mercado Livre brand footer: "desde que
 * autorizada pelas regras do programa de afiliados." Not having verified
 * ML's exact logo-usage guidelines, this renders a plain TEXT mention
 * ("Disponível no Mercado Livre"), never their actual logo/trademark
 * graphic — using the real logo asset needs that policy check first,
 * flagged explicitly rather than guessed.
 */

const FINAL_WIDTH = 1080;
const FINAL_HEIGHT = 1350;
const BRAND_DARK_BLUE = "#1e293b";
// Owner's requirement, 2026-11-20 ("Fábrica de Criativos integrada ao
// XML"): "paleta comercial com amarelo, azul-escuro, branco e vermelho
// QUANDO ADEQUADO" — never forced on every product. The one real,
// defensible trigger for yellow here is a genuine, already-confirmed
// price drop (the same `hasRealDrop` gate that controls the crossed-out
// price): a yellow discount badge is a real, recognizable e-commerce
// convention for "this is a real deal", never decoration for its own
// sake, and never shown without a real percentage behind it.
const BRAND_YELLOW = "#facc15";
// Owner's finding, 2026-11-20 ("padrão Hidrabene, referência real"): the
// reference creative's accent color for its badge and benefit icons is
// a magenta/pink, not present anywhere in the palette before. Only used
// on the badge/icon accents below, never as a base color — real,
// recognizable e-commerce "highlight" convention, same category as the
// yellow discount badge.
const BRAND_MAGENTA = "#db2777";
const LEFT_PANEL_BG = "#fffafb";

export interface CompositeInput {
  /** The AI base image, as a data URI (base64) — ImageResponse/Satori
   * needs a URL or data URI for <img>, never a raw Buffer directly. */
  aiBaseImageDataUri: string;
  title: string;
  brand: string | null;
  currentPrice: number;
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
  /** Owner's requirement, 2026-11-20 ("Evolução da Fábrica de
   * Criativos"): real, traceable benefit lines from
   * product-interpretation.ts's CreativeProfile — never invented copy.
   * 0-4 items; the section simply doesn't render when empty (a product
   * with nothing real to say gets a simpler piece, never a padded one). */
  benefits?: string[];
}

function priceTag(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** The clean render — just the AI composition, precisely resized/cropped
 * to 1080x1350. No overlay at all. */
export function renderCatalogClean(input: { aiBaseImageDataUri: string }) {
  return new ImageResponse(
    (
      <div style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={input.aiBaseImageDataUri}
          alt=""
          width={FINAL_WIDTH}
          height={FINAL_HEIGHT}
          style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, objectFit: "cover" }}
        />
      </div>
    ),
    { width: FINAL_WIDTH, height: FINAL_HEIGHT },
  );
}

const BOTTOM_BANNER_HEIGHT = 110;
const LEFT_COLUMN_WIDTH = 460;

/** Owner's finding, 2026-11-20 ("padrão Hidrabene, referência real"):
 * the previous version ("foto cheia + painel escuro embaixo") does not
 * reproduce the reference's REASONING — a two-column layout where the
 * left panel carries brand/benefits/price and the right column is the
 * product photo, closing in a full-width yellow CTA banner. Rebuilt
 * from scratch against that exact structure (verified against the real
 * Hidrabene FPS 70 reference image the owner supplied): serif brand
 * name, magenta benefit icons/badge, angled red price card with a
 * yellow number, yellow bottom banner. The real Mercado Livre logo
 * graphic is still NOT used (unverified brand-usage rights, same
 * caveat as before) — the banner uses text only, in the same position
 * and color the reference's real logo would occupy. */
export function renderAdOverlay(input: CompositeInput) {
  const hasRealDrop = input.hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice;
  // Real percentage, computed from the same two real prices already
  // driving the crossed-out tag below — never a separate, possibly
  // stale source, never rounded up for effect.
  const realDiscountPercent = hasRealDrop ? Math.round((1 - input.currentPrice / input.referencePrice!) * 100) : null;
  const benefits = (input.benefits ?? []).slice(0, 4);
  const shortTitle = input.title.length > 60 ? `${input.title.slice(0, 60)}…` : input.title;

  return new ImageResponse(
    (
      <div style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
        {/* Main two-column area */}
        <div style={{ display: "flex", flex: 1, width: FINAL_WIDTH, height: FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT, position: "relative" }}>
          {/* LEFT column — brand, benefits, price */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: LEFT_COLUMN_WIDTH,
              height: "100%",
              background: LEFT_PANEL_BG,
              padding: "48px 36px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, fontFamily: "serif", color: BRAND_DARK_BLUE, lineHeight: 1.1 }}>
              {input.brand ?? "PreçoCaindo"}
            </div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#475569", marginTop: 8, marginBottom: 20 }}>
              {shortTitle}
            </div>
            {realDiscountPercent !== null && (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  background: BRAND_MAGENTA,
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 800,
                  padding: "8px 20px",
                  borderRadius: 999,
                  marginBottom: 24,
                }}
              >
                {`-${realDiscountPercent}% OFF`}
              </div>
            )}
            {benefits.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
                {benefits.map((benefit, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: 999,
                        border: `3px solid ${BRAND_MAGENTA}`,
                        background: "#ffffff",
                      }}
                    />
                    <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "#1f2937", lineHeight: 1.25 }}>{benefit}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Price card — bottom of the left column. Owner's finding,
                2026-11-20: a slight rotation (matching the reference's
                angled badge) silently failed to render via Satori/
                next-og in a live test — dropped rather than shipping an
                effect that may or may not apply depending on renderer
                quirks; the card still reads as a clear, recognizable
                price callout without it. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                left: 30,
                bottom: 36,
                background: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)",
                borderRadius: 18,
                padding: "16px 26px",
              }}
            >
              <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: "#fecaca" }}>Por apenas</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: BRAND_YELLOW }}>R$</div>
                <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: BRAND_YELLOW }}>
                  {priceTag(input.currentPrice).replace("R$", "").trim()}
                </div>
              </div>
              {hasRealDrop && (
                <div style={{ display: "flex", fontSize: 16, color: "#fecaca", textDecoration: "line-through" }}>
                  de {priceTag(input.referencePrice!)}
                </div>
              )}
            </div>
          </div>
          {/* RIGHT column — the real product photo */}
          <div style={{ display: "flex", width: FINAL_WIDTH - LEFT_COLUMN_WIDTH, height: "100%", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={input.aiBaseImageDataUri}
              alt=""
              width={FINAL_WIDTH - LEFT_COLUMN_WIDTH}
              height={FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT}
              style={{ width: FINAL_WIDTH - LEFT_COLUMN_WIDTH, height: FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT, objectFit: "cover" }}
            />
          </div>
        </div>
        {/* Bottom full-width banner — same position the reference uses for the real ML logo + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: FINAL_WIDTH,
            height: BOTTOM_BANNER_HEIGHT,
            background: BRAND_YELLOW,
            padding: "0 32px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: BRAND_DARK_BLUE }}>PreçoCaindo</div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: BRAND_DARK_BLUE }}>Disponível no Mercado Livre</div>
          </div>
          <div
            style={{
              display: "flex",
              background: BRAND_DARK_BLUE,
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 700,
              padding: "14px 28px",
              borderRadius: 999,
            }}
          >
            Compre agora no Mercado Livre
          </div>
        </div>
      </div>
    ),
    { width: FINAL_WIDTH, height: FINAL_HEIGHT },
  );
}

export const CREATIVE_FINAL_DIMENSIONS = { width: FINAL_WIDTH, height: FINAL_HEIGHT };

/** ImageResponse implements the Response interface (it IS one) — this
 * just makes the call sites read cleanly as "give me real PNG bytes". */
export async function toBuffer(response: ImageResponse): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

export class CtaBarAssetMissingError extends Error {}

/** Real, measured proportion of the approved reference's CTA bar height
 * relative to its total image height — data/vitrine-creative-reference/
 * classification.json's own measurement (scanned near-left/near-right
 * edge columns bottom-up for the first non-yellow row): bar_height_px
 * 177 / total_height 1402 = 0.12625. Applied to the OUTPUT canvas's own
 * real height (not hardcoded to 1350) so this stays correct even for an
 * image that isn't exactly today's default size — e.g. the batch
 * corrector reads each existing file's real dimensions rather than
 * assuming they all match. */
export const CTA_BAR_HEIGHT_FRACTION = 0.12625;

/** Pure, DB-free, render-free — just the arithmetic, so it's unit-
 * testable without decoding a single pixel. */
export function computeCtaBarPlacement(canvasWidth: number, canvasHeight: number): { barWidth: number; barHeight: number; barY: number } {
  const barHeight = Math.round(canvasHeight * CTA_BAR_HEIGHT_FRACTION);
  return { barWidth: canvasWidth, barHeight, barY: canvasHeight - barHeight };
}

function loadCtaBarAsset(): { buffer: Buffer; contentType: string } {
  const configuredPath = env.VITRINE_CTA_BAR_ASSET_PATH;
  const resolved = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  if (!existsSync(resolved)) {
    throw new CtaBarAssetMissingError(
      `Faixa CTA do Mercado Livre (aprovada) não encontrada em "${resolved}" (VITRINE_CTA_BAR_ASSET_PATH). ` +
        "Nunca cai de volta para deixar a IA desenhar a faixa de novo — isto é intencional.",
    );
  }
  return { buffer: readFileSync(resolved), contentType: "image/png" };
}

export interface CompositeCtaBarInput {
  /** The already-composed base image (product/price/background, drawn
   * by the AI, already cropped/resized to the final canvas size) as a
   * data URI. Its bottom CTA_BAR_HEIGHT_FRACTION is fully occluded by
   * this call regardless of what the AI drew there — the AI no longer
   * has any content or geometric control over that region. */
  baseImageDataUri: string;
  width: number;
  height: number;
}

/** Owner's directive, 2026-11-24 ("quer um corte determinístico, não
 * apenas um texto de prompt"): composites the real, approved Mercado
 * Livre CTA bar (handshake icon, wordmark, button — see
 * data/vitrine-creative-reference/cta-bar-1080w.png) onto the bottom of
 * a generated image, pixel-identical every time, via the SAME Satori/
 * next-og technology this file already uses for renderCatalogClean/
 * renderAdOverlay — no new rendering dependency. The bar asset is
 * opaque, so painting it on top fully replaces whatever (if anything)
 * the AI drew in that same region; nothing needs to be cropped out of
 * the base image first. Used both for brand-new generations
 * (jobs/vitrine-creative-factory.ts) and for correcting already-existing
 * defective files (scripts/fix-local-creative-cta-bars.ts) — same
 * function, same guarantee, either way. */
export async function compositeDeterministicCtaBar(input: CompositeCtaBarInput): Promise<Buffer> {
  const bar = loadCtaBarAsset();
  const barDataUri = `data:${bar.contentType};base64,${bar.buffer.toString("base64")}`;
  const { barWidth, barHeight, barY } = computeCtaBarPlacement(input.width, input.height);

  const response = new ImageResponse(
    (
      <div style={{ width: input.width, height: input.height, display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={input.baseImageDataUri}
          alt=""
          width={input.width}
          height={input.height}
          style={{ position: "absolute", top: 0, left: 0, width: input.width, height: input.height, objectFit: "cover" }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={barDataUri}
          alt=""
          width={barWidth}
          height={barHeight}
          style={{ position: "absolute", top: barY, left: 0, width: barWidth, height: barHeight, objectFit: "cover" }}
        />
      </div>
    ),
    { width: input.width, height: input.height },
  );
  return toBuffer(response);
}

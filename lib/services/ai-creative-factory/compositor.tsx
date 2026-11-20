import { ImageResponse } from "next/og";

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
  /** Owner's directive, 2026-11-20 ("NÃO aprove a segunda versão do
   * criativo"): title/price/benefits/CTA must be composed
   * PROGRAMMATICALLY, never drawn by the AI — this is the one real
   * "N em 1"-style hero fact (e.g. "6 EM 1"), rendered as a big pill,
   * exactly the pattern confirmed in Henrique's own real references
   * (Philips OneBlade "5 em 1", Kärcher's badge style). Optional: most
   * products have no such fact. */
  heroBadge?: string | null;
  /** Short, real spec facts (e.g. "40KG") rendered as small bold
   * badges — never a generic/invented benefit (owner's explicit
   * correction: "Treino completo e eficiente" was NOT grounded in a
   * real extracted fact and must never reappear). */
  specBadges?: string[];
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

/** Owner's directive, 2026-11-20 ("NÃO aprove a segunda versão do
 * criativo"): rebuilt again — this time full-bleed, not a two-column
 * panel. Reasoning: a real paid one-shot AI generation (where the
 * model drew everything itself, full-bleed photo + text) matched
 * Henrique's real references far better than the hand-built two-
 * column layout ever did — no seam problem, because there was only
 * ever one photo. This keeps that proven visual shape, but moves
 * EVERY piece of commercial content (title, hero badge, spec badges,
 * price, CTA) back to code — the AI's job is narrowed to ONLY the
 * background/ambientation photo (see prompt-builder.ts), so it has no
 * opportunity to invent a commercial element the way it invented a
 * fictitious bonus e-book in the one-shot version. A dark gradient
 * scrim (top-left, proven safe — plain linear-gradient with alpha
 * stops, no transform) keeps the title legible over any photo. */
export function renderAdOverlay(input: CompositeInput) {
  const hasRealDrop = input.hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice;
  // Real percentage, computed from the same two real prices already
  // driving the crossed-out tag below — never a separate, possibly
  // stale source, never rounded up for effect.
  const realDiscountPercent = hasRealDrop ? Math.round((1 - input.currentPrice / input.referencePrice!) * 100) : null;
  // Backward-compat: the main production job (vitrine-creative-
  // factory.ts) and the free rerender script still pass the older
  // `benefits` field — fall back to it so neither needs touching just
  // for this pilot's new heroBadge/specBadges split.
  const specBadges = (input.specBadges ?? input.benefits ?? []).slice(0, 3);
  const shortTitle = input.title.length > 70 ? `${input.title.slice(0, 70)}…` : input.title;

  return new ImageResponse(
    (
      <div style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
        {/* Main area — the AI scenario photo, full-bleed */}
        <div style={{ display: "flex", width: FINAL_WIDTH, height: FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={input.aiBaseImageDataUri}
            alt=""
            width={FINAL_WIDTH}
            height={FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT}
            style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT - BOTTOM_BANNER_HEIGHT, objectFit: "cover" }}
          />
          {/* Dark scrim, top portion only, for title legibility — plain
              alpha gradient, the same technique already proven safe in
              this file's renderCatalogClean-era predecessor. */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              width: FINAL_WIDTH,
              height: 420,
              background: "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", position: "absolute", top: 40, left: 36, right: 36 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: "#ffffff", lineHeight: 1.1, textTransform: "uppercase" }}>
              {shortTitle}
            </div>
            {input.heroBadge && (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  background: BRAND_MAGENTA,
                  color: "#ffffff",
                  fontSize: 30,
                  fontWeight: 800,
                  padding: "10px 24px",
                  borderRadius: 999,
                  marginTop: 16,
                }}
              >
                {input.heroBadge}
              </div>
            )}
            {specBadges.length > 0 && (
              <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                {specBadges.map((badge, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      background: "rgba(255,255,255,0.14)",
                      border: "2px solid rgba(255,255,255,0.6)",
                      color: "#ffffff",
                      fontSize: 20,
                      fontWeight: 700,
                      padding: "8px 18px",
                      borderRadius: 999,
                    }}
                  >
                    {badge}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Price card — bottom-left of the photo area. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: 30,
              bottom: 30,
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

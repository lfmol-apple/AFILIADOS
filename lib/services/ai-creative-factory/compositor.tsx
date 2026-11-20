import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

let cachedLogo: string | null | undefined;
function priceCaindoLogoDataUri(): string | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const bytes = readFileSync(join(process.cwd(), "public", "logo-icon.png"));
    cachedLogo = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

const FINAL_WIDTH = 1080;
const FINAL_HEIGHT = 1350;
const BRAND_RED = "#dc2626";
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

export interface CompositeInput {
  /** The AI base image, as a data URI (base64) — ImageResponse/Satori
   * needs a URL or data URI for <img>, never a raw Buffer directly. */
  aiBaseImageDataUri: string;
  title: string;
  currentPrice: number;
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
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

/** The ad-ready render — same base image, with this project's own
 * price/name/CTA baked in with exact placement, for manual ads with no
 * native Meta overlay. */
export function renderAdOverlay(input: CompositeInput) {
  const logo = priceCaindoLogoDataUri();
  const hasRealDrop = input.hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice;
  // Real percentage, computed from the same two real prices already
  // driving the crossed-out tag below — never a separate, possibly
  // stale source, never rounded up for effect.
  const realDiscountPercent = hasRealDrop ? Math.round((1 - input.currentPrice / input.referencePrice!) * 100) : null;

  return new ImageResponse(
    (
      <div style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, display: "flex", position: "relative", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={input.aiBaseImageDataUri}
          alt=""
          width={FINAL_WIDTH}
          height={FINAL_HEIGHT}
          style={{ width: FINAL_WIDTH, height: FINAL_HEIGHT, objectFit: "cover", position: "absolute" }}
        />
        {realDiscountPercent !== null && (
          <div
            style={{
              position: "absolute",
              top: 36,
              left: 36,
              display: "flex",
              background: BRAND_YELLOW,
              color: BRAND_DARK_BLUE,
              fontSize: 30,
              fontWeight: 800,
              padding: "10px 22px",
              borderRadius: 10,
            }}
          >
            {`-${realDiscountPercent}%`}
          </div>
        )}
        {/* Bottom gradient panel for legibility over any background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "40px 48px 44px 48px",
            background: "linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.55) 60%, rgba(15,23,42,0) 100%)",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", lineHeight: 1.15, marginBottom: 14 }}>
            {input.title.length > 70 ? `${input.title.slice(0, 70)}…` : input.title}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18 }}>
            {hasRealDrop && (
              <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1", textDecoration: "line-through" }}>
                {priceTag(input.referencePrice!)}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#ffffff" }}>
              {priceTag(input.currentPrice)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: BRAND_RED,
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              padding: "14px 32px",
              borderRadius: 999,
              marginBottom: 20,
            }}
          >
            Compre agora no Mercado Livre
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={28} height={28} alt="" style={{ borderRadius: 6 }} />
            )}
            <div style={{ display: "flex", fontSize: 20, color: "#e2e8f0", fontWeight: 600 }}>PreçoCaindo</div>
            <div style={{ display: "flex", fontSize: 18, color: "#94a3b8" }}>· Disponível no Mercado Livre</div>
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

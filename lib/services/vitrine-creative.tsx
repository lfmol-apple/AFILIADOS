import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Vitrine Inteligente — automatic ad-creative template (owner's request,
 * 2026-11-19): a reusable graphic template rendered on demand from real
 * product data, NOT generative AI (no per-image API cost, no model call —
 * this is deterministic layout rendering via Next's built-in next/og
 * ImageResponse, the same Satori/resvg engine Next uses for og-image
 * routes). Because it renders live from the database on every request,
 * there is nothing to "regenerate" when a price changes or a product
 * enters the Vitrine — the next fetch already reflects current data. See
 * app/api/vitrine/creative/[merchantListingId]/route.ts for the route that
 * uses this.
 */

const LOGO_DATA_URI = (() => {
  try {
    const bytes = readFileSync(join(process.cwd(), "public", "logo-icon.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null; // template still renders without the logo rather than failing
  }
})();

const BRAND_COLOR = "#0f766e";

export interface CreativeInput {
  title: string;
  imageUrl: string;
  brand: string | null;
  currentPrice: number;
  /** Real, merchant-disclosed values only (same fields as
   * MerchantListingFacts.referencePrice/discountPercent) — never a
   * computed/guessed discount. Omitted entirely when null, never shown
   * as "0% off" or similar fabricated placeholder. */
  referencePrice: number | null;
  discountPercent: number | null;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * The JSX tree for ImageResponse — 1080x1080 (Meta's recommended square
 * feed-ad size, works for both Facebook and Instagram placements). Kept
 * intentionally plain (product photo, price, real discount badge when one
 * exists, brand footer) rather than a dense layout — Meta's ad-quality
 * review favors legible, uncluttered creatives, and a busier template is
 * more likely to need per-product tweaking, defeating the point of a
 * reusable one.
 */
export function buildCreativeElement(input: CreativeInput) {
  const hasRealDiscount =
    input.discountPercent !== null &&
    input.discountPercent > 0 &&
    input.referencePrice !== null &&
    input.referencePrice > input.currentPrice;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={input.imageUrl}
          alt=""
          width={820}
          height={820}
          style={{ objectFit: "contain" }}
        />
        {hasRealDiscount && (
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 40,
              display: "flex",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              borderRadius: 999,
              padding: "16px 28px",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            -{Math.round(input.discountPercent! * 100)}%
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "32px 48px",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#1e293b",
            lineHeight: 1.2,
            maxHeight: 90,
            overflow: "hidden",
          }}
        >
          {input.title.length > 70 ? `${input.title.slice(0, 70)}…` : input.title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: BRAND_COLOR }}>
            {formatBRL(input.currentPrice)}
          </div>
          {hasRealDiscount && (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              {formatBRL(input.referencePrice!)}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          backgroundColor: BRAND_COLOR,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {LOGO_DATA_URI && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_DATA_URI} alt="" width={40} height={40} />
          )}
          <div style={{ display: "flex", fontSize: 28, color: "#ffffff", fontWeight: 700 }}>
            PreçoCaindo
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#d1fae5" }}>
          no Mercado Livre
        </div>
      </div>
    </div>
  );
}

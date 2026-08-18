import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/queries/products";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import { calculateDecision, labelForVerdict } from "@/lib/services/decision-engine";
import { formatCurrency } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.offers[0] || !product.priceStats) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0f766e",
          color: "white",
          fontSize: 48,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        PreçoCaindo
      </div>,
      size,
    );
  }

  const offer = product.offers[0];
  const stats = product.priceStats;
  const statsResult = {
    currentPrice: Number(stats.currentPrice),
    lowestPrice: Number(stats.lowestPrice),
    highestPrice: Number(stats.highestPrice),
    avg7d: stats.avg7d ? Number(stats.avg7d) : null,
    avg30d: stats.avg30d ? Number(stats.avg30d) : null,
    avg90d: stats.avg90d ? Number(stats.avg90d) : null,
    dropPercentage: stats.dropPercentage,
    distanceFromLow: stats.distanceFromLow ?? 0,
    historicalPosition: stats.historicalPosition ?? 0,
    dataPointCount: stats.dataPointCount,
    coverageDays: stats.coverageDays,
  };
  const opportunity = calculateOpportunityScore({
    currentPrice: Number(offer.price),
    listedDiscountPercentage: offer.discountPercentage,
    rating: product.rating,
    reviewCount: product.reviewCount,
    availability: offer.availability,
    stats: statsResult,
  });
  // Same visitor-facing question as ScorePanel on the page itself — reuses
  // the OpportunityScore sub-computation as a signal, but the label shown
  // here is the Decision Engine's verdict, never the internal ranking
  // score (docs/ARCHITECTURE.md).
  const decision = calculateDecision({ hasOffer: true, stats: statsResult, opportunity });

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#f6f7f6",
        padding: 64,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 32,
          fontWeight: 700,
          color: "#0f766e",
        }}
      >
        ↓ PreçoCaindo
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 40,
          fontSize: 44,
          fontWeight: 700,
          color: "#0f1720",
          lineHeight: 1.2,
        }}
      >
        {product.title.slice(0, 80)}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 32,
          alignItems: "baseline",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            color: "#0f1720",
          }}
        >
          {formatCurrency(Number(offer.price), offer.currency)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          padding: "10px 24px",
          background: "#d1fae5",
          color: "#047857",
          fontSize: 28,
          borderRadius: 999,
          width: "fit-content",
        }}
      >
        {labelForVerdict(decision.verdict)}
      </div>
    </div>,
    size,
  );
}

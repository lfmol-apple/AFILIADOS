import type { Availability } from "@/types/commerce";
import type { PriceStatsResult } from "./price-stats";

export interface OpportunityScoreInput {
  currentPrice: number;
  listedDiscountPercentage?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  availability: Availability;
  stats: PriceStatsResult;
}

export interface OpportunityScoreResult {
  score: number;
  priceScore: number;
  discountScore: number;
  popularityScore: number;
  ratingScore: number;
  historicalScore: number;
  confidence: number;
  /** Only meaningful once confidence clears MIN_CONFIDENCE_FOR_LABEL. */
  label: string;
  insufficientHistory: boolean;
}

const WEIGHTS = {
  price: 0.3,
  discount: 0.15,
  historical: 0.2,
  rating: 0.1,
  popularity: 0.1,
  availability: 0.15,
};

const MIN_DATA_POINTS_FOR_HISTORY = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Maps a percentage drop against the historical baseline onto 0-100.
 * 0% (at baseline) -> 50, +25% or more below baseline -> 100, -25% or more
 * above baseline -> 0. */
function scorePriceVsBaseline(dropPercentage: number | null): number {
  if (dropPercentage === null) return 50;
  return clamp(50 + (dropPercentage / 25) * 50, 0, 100);
}

function scoreDiscount(discountPercentage: number | null | undefined): number {
  if (!discountPercentage || discountPercentage <= 0) return 0;
  return clamp((discountPercentage / 50) * 100, 0, 100);
}

function scoreHistoricalPosition(distanceFromLow: number): number {
  return clamp((1 - distanceFromLow) * 100, 0, 100);
}

function scoreRating(rating: number | null | undefined): number {
  if (rating === null || rating === undefined) return 50;
  return clamp((rating / 5) * 100, 0, 100);
}

function scorePopularity(reviewCount: number | null | undefined): number {
  if (!reviewCount || reviewCount <= 0) return 0;
  // log scale: 10 reviews ~ 33, 100 ~ 66, 1000+ ~ 100.
  return clamp((Math.log10(reviewCount + 1) / 3) * 100, 0, 100);
}

function scoreAvailability(availability: Availability): number {
  if (availability === "IN_STOCK") return 100;
  if (availability === "UNKNOWN") return 50;
  return 0;
}

function scoreConfidence(stats: PriceStatsResult): number {
  const pointsFactor = clamp(stats.dataPointCount / 10, 0, 1);
  const coverageFactor = clamp(stats.coverageDays / 30, 0, 1);
  return round2(pointsFactor * coverageFactor);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function labelForScore(score: number, insufficientHistory: boolean): string {
  if (insufficientHistory) return "Ainda estamos acompanhando este preço.";
  if (score >= 90) return "Excelente preço";
  if (score >= 75) return "Bom momento para comprar";
  if (score >= 55) return "Preço razoável";
  if (score >= 35) return "Talvez valha esperar";
  return "Preço alto em relação ao histórico";
}

/**
 * Deterministic, explainable 0-100 score — never computed by an LLM (project
 * brief section 7). Every sub-score is independently inspectable so the
 * product page can show *why* a price got its label instead of asserting
 * false precision.
 */
export function calculateOpportunityScore(input: OpportunityScoreInput): OpportunityScoreResult {
  const insufficientHistory = input.stats.dataPointCount < MIN_DATA_POINTS_FOR_HISTORY;

  const priceScore = Math.round(scorePriceVsBaseline(input.stats.dropPercentage));
  const discountScore = Math.round(scoreDiscount(input.listedDiscountPercentage));
  const historicalScore = insufficientHistory
    ? 50
    : Math.round(scoreHistoricalPosition(input.stats.distanceFromLow));
  const ratingScore = Math.round(scoreRating(input.rating));
  const popularityScore = Math.round(scorePopularity(input.reviewCount));
  const availabilityScore = Math.round(scoreAvailability(input.availability));

  const weighted =
    priceScore * WEIGHTS.price +
    discountScore * WEIGHTS.discount +
    historicalScore * WEIGHTS.historical +
    ratingScore * WEIGHTS.rating +
    popularityScore * WEIGHTS.popularity +
    availabilityScore * WEIGHTS.availability;

  const score = Math.round(clamp(weighted, 0, 100));
  const confidence = scoreConfidence(input.stats);

  return {
    score,
    priceScore,
    discountScore,
    popularityScore,
    ratingScore,
    historicalScore,
    confidence,
    label: labelForScore(score, insufficientHistory),
    insufficientHistory,
  };
}

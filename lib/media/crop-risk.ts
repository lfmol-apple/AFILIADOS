import type { ImageDimensions } from "./image-dimensions";

export type MetaPlacementId = "feed_1_1" | "feed_4_5" | "stories" | "reels";

export interface PlacementSpec {
  id: MetaPlacementId;
  label: string;
  /** width / height */
  ratio: number;
}

/**
 * Owner's directive, 2026-11-26 ("Considere os formatos 1:1, 4:5 e
 * 9:16, conforme o posicionamento"): the real Meta ad placements this
 * campaign can run in. Stories and Reels share the same 9:16 frame —
 * kept as two entries because they're two different real placements a
 * campaign targets, not two ratios.
 */
export const META_PLACEMENTS: readonly PlacementSpec[] = [
  { id: "feed_1_1", label: "Feed 1:1", ratio: 1 },
  { id: "feed_4_5", label: "Feed 4:5", ratio: 4 / 5 },
  { id: "stories", label: "Stories 9:16", ratio: 9 / 16 },
  { id: "reels", label: "Reels 9:16", ratio: 9 / 16 },
];

/**
 * Fraction of the image an object-cover crop would cut off before we
 * call it a real risk. This is a mechanical aspect-ratio signal, not a
 * text/logo detector — it says the geometry is at risk, never that a
 * specific element is or isn't cut. Below this, the tightening a
 * cover-crop always does is treated as normal, not a finding.
 */
const RISK_THRESHOLD = 0.1;

export interface CropAssessment {
  placement: PlacementSpec;
  /** 0..1 — fraction of the image's area lost to the crop. */
  cutFraction: number;
  axis: "none" | "horizontal" | "vertical";
  risk: boolean;
}

export function assessCrop(dimensions: ImageDimensions, placement: PlacementSpec): CropAssessment {
  const imageRatio = dimensions.width / dimensions.height;
  let cutFraction = 0;
  let axis: CropAssessment["axis"] = "none";
  if (imageRatio > placement.ratio) {
    // Image is relatively wider than the target — object-cover scales
    // to match height and crops the left/right edges.
    cutFraction = 1 - placement.ratio / imageRatio;
    axis = "horizontal";
  } else if (imageRatio < placement.ratio) {
    // Image is relatively taller — crops the top/bottom edges.
    cutFraction = 1 - imageRatio / placement.ratio;
    axis = "vertical";
  }
  return { placement, cutFraction, axis, risk: cutFraction > RISK_THRESHOLD };
}

export function assessAllPlacements(dimensions: ImageDimensions): CropAssessment[] {
  return META_PLACEMENTS.map((p) => assessCrop(dimensions, p));
}

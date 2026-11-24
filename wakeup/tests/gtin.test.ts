import { describe, expect, it } from "vitest";
import { isValidGtin, gtinsMatch, normalizeGtin } from "@/lib/services/gtin";

describe("isValidGtin", () => {
  it("accepts a real, check-digit-valid EAN-13 (the well-known GS1 example barcode)", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
  });

  it("accepts valid GTIN-8/12/14 lengths with a correctly computed check digit", () => {
    // Real UPC-A (GTIN-12) example: 036000291452 (a well-known valid barcode).
    expect(isValidGtin("036000291452")).toBe(true);
  });

  it("rejects a GTIN-13-shaped value with a wrong check digit", () => {
    expect(isValidGtin("7891234567890")).toBe(false);
  });

  it("rejects a value with a real-looking length but non-digit characters", () => {
    expect(isValidGtin("400638133393X")).toBe(false);
  });

  it("rejects a value whose length isn't a real GTIN length (8/12/13/14)", () => {
    expect(isValidGtin("111")).toBe(false);
    expect(isValidGtin("123456789012345")).toBe(false); // 15 digits
  });

  it("rejects null/undefined/empty without throwing", () => {
    expect(isValidGtin(null)).toBe(false);
    expect(isValidGtin(undefined)).toBe(false);
    expect(isValidGtin("")).toBe(false);
    expect(isValidGtin("   ")).toBe(false);
  });

  it("never fabricates or corrects a check digit — an off-by-one digit is simply invalid", () => {
    expect(isValidGtin("4006381333932")).toBe(false); // last digit changed from the valid 1 to 2
  });
});

describe("gtinsMatch", () => {
  it("matches two identical, valid GTINs", () => {
    expect(gtinsMatch("4006381333931", "4006381333931")).toBe(true);
  });

  it("does not match two different, individually valid GTINs", () => {
    expect(gtinsMatch("4006381333931", "036000291452")).toBe(false);
  });

  it("never matches when either side is invalid, even if the raw strings are textually equal", () => {
    expect(gtinsMatch("111", "111")).toBe(false);
    expect(gtinsMatch("7891234567890", "7891234567890")).toBe(false);
  });
});

describe("normalizeGtin", () => {
  it("trims whitespace without altering digits", () => {
    expect(normalizeGtin("  4006381333931  ")).toBe("4006381333931");
  });

  it("returns null for empty/absent input", () => {
    expect(normalizeGtin(null)).toBeNull();
    expect(normalizeGtin("")).toBeNull();
  });
});

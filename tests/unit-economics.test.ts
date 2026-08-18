import { describe, expect, it } from "vitest";
import {
  calculateUnitEconomics,
  readUnitEconomicsSpec,
} from "@/lib/services/unit-economics";

describe("readUnitEconomicsSpec", () => {
  it("reads a kg-based specification from Product.specifications", () => {
    expect(
      readUnitEconomicsSpec({ economicUnit: "kg", netWeightKg: 4 }),
    ).toEqual({ economicUnit: "kg", quantity: 4 });
  });

  it("accepts numeric strings with Brazilian decimal commas", () => {
    expect(
      readUnitEconomicsSpec({ economicUnit: "kg", netWeightKg: "4,5" }),
    ).toEqual({ economicUnit: "kg", quantity: 4.5 });
  });

  it("supports future recurring-commerce units without pet-specific branches", () => {
    expect(
      readUnitEconomicsSpec({ economicUnit: "liter", netVolumeLiters: 5 }),
    ).toEqual({ economicUnit: "liter", quantity: 5 });
    expect(
      readUnitEconomicsSpec({ economicUnit: "unit", unitCount: 30 }),
    ).toEqual({ economicUnit: "unit", quantity: 30 });
    expect(
      readUnitEconomicsSpec({ economicUnit: "ml", netVolumeMl: 400 }),
    ).toEqual({ economicUnit: "ml", quantity: 400 });
    expect(
      readUnitEconomicsSpec({ economicUnit: "capsule", capsuleCount: 10 }),
    ).toEqual({ economicUnit: "capsule", quantity: 10 });
    expect(
      readUnitEconomicsSpec({ economicUnit: "dose", doseCount: 3 }),
    ).toEqual({ economicUnit: "dose", quantity: 3 });
  });

  it("returns null for unsupported or incomplete specs", () => {
    expect(readUnitEconomicsSpec(null)).toBeNull();
    expect(
      readUnitEconomicsSpec({ economicUnit: "ml", netWeightKg: 4 }),
    ).toBeNull();
    expect(readUnitEconomicsSpec({ economicUnit: "kg" })).toBeNull();
    expect(
      readUnitEconomicsSpec({ economicUnit: "kg", netWeightKg: 0 }),
    ).toBeNull();
  });
});

describe("calculateUnitEconomics", () => {
  it("calculates price per kg without fabricating missing price", () => {
    expect(
      calculateUnitEconomics({
        specifications: { economicUnit: "kg", netWeightKg: 4 },
        currentPrice: 59.84,
      }),
    ).toEqual({ unit: "kg", label: "kg", quantity: 4, pricePerUnit: 14.96 });

    expect(
      calculateUnitEconomics({
        specifications: { economicUnit: "kg", netWeightKg: 4 },
        currentPrice: null,
      }),
    ).toEqual({ unit: "kg", label: "kg", quantity: 4, pricePerUnit: null });
  });

  it("returns unavailable instead of zero or NaN for invalid prices", () => {
    expect(
      calculateUnitEconomics({
        specifications: { economicUnit: "kg", netWeightKg: 4 },
        currentPrice: Number.NaN,
      })?.pricePerUnit,
    ).toBeNull();
    expect(
      calculateUnitEconomics({
        specifications: { economicUnit: "kg", netWeightKg: 4 },
        currentPrice: 0,
      })?.pricePerUnit,
    ).toBeNull();
  });
});

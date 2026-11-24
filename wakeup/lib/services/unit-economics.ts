export type EconomicUnit = "kg" | "liter" | "unit" | "ml" | "capsule" | "dose";

export interface UnitEconomicsSpec {
  economicUnit: EconomicUnit;
  quantity: number;
}

export interface UnitEconomicsResult {
  unit: EconomicUnit;
  label: string;
  quantity: number;
  pricePerUnit: number | null;
}

const QUANTITY_FIELD_BY_UNIT: Record<EconomicUnit, string> = {
  kg: "netWeightKg",
  liter: "netVolumeLiters",
  unit: "unitCount",
  ml: "netVolumeMl",
  capsule: "capsuleCount",
  dose: "doseCount",
};

const LABEL_BY_UNIT: Record<EconomicUnit, string> = {
  kg: "kg",
  liter: "litro",
  unit: "unidade",
  ml: "ml",
  capsule: "cápsula",
  dose: "dose",
};

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function readUnitEconomicsSpec(
  specifications: unknown,
): UnitEconomicsSpec | null {
  if (
    !specifications ||
    typeof specifications !== "object" ||
    Array.isArray(specifications)
  ) {
    return null;
  }

  const specs = specifications as Record<string, unknown>;
  const economicUnit = specs.economicUnit;
  if (
    economicUnit !== "kg" &&
    economicUnit !== "liter" &&
    economicUnit !== "unit" &&
    economicUnit !== "ml" &&
    economicUnit !== "capsule" &&
    economicUnit !== "dose"
  ) {
    return null;
  }

  const quantityField = QUANTITY_FIELD_BY_UNIT[economicUnit];
  const quantity = toPositiveNumber(specs[quantityField]);
  if (quantity === null) return null;

  return { economicUnit, quantity };
}

export function calculateUnitEconomics(input: {
  specifications: unknown;
  currentPrice?: number | null;
}): UnitEconomicsResult | null {
  const spec = readUnitEconomicsSpec(input.specifications);
  if (!spec) return null;
  const currentPrice = toPositiveNumber(input.currentPrice);

  return {
    unit: spec.economicUnit,
    label: LABEL_BY_UNIT[spec.economicUnit],
    quantity: spec.quantity,
    pricePerUnit: currentPrice
      ? Math.round((currentPrice / spec.quantity) * 100) / 100
      : null,
  };
}

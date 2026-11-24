"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type UnitKind = "g" | "kg" | "ml" | "l" | "un";

function positiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeQuantity(quantity: number, unit: UnitKind): number {
  if (unit === "g" || unit === "ml") return quantity / 1000;
  return quantity;
}

function unitLabel(unit: UnitKind): string {
  if (unit === "g" || unit === "kg") return "kg";
  if (unit === "ml" || unit === "l") return "litro";
  return "unidade";
}

export function UnitComparisonTool() {
  const [priceA, setPriceA] = useState("");
  const [quantityA, setQuantityA] = useState("");
  const [unitA, setUnitA] = useState<UnitKind>("g");
  const [priceB, setPriceB] = useState("");
  const [quantityB, setQuantityB] = useState("");
  const [unitB, setUnitB] = useState<UnitKind>("kg");

  const result = useMemo(() => {
    const aPrice = positiveNumber(priceA);
    const aQuantity = positiveNumber(quantityA);
    const bPrice = positiveNumber(priceB);
    const bQuantity = positiveNumber(quantityB);
    if (!aPrice || !aQuantity || !bPrice || !bQuantity) return null;
    const aBase = normalizeQuantity(aQuantity, unitA);
    const bBase = normalizeQuantity(bQuantity, unitB);
    const resolvedUnit = unitLabel(unitA);
    if (resolvedUnit !== unitLabel(unitB))
      return { incompatible: true } as const;
    const aUnit = aPrice / aBase;
    const bUnit = bPrice / bBase;
    const cheaper = Math.min(aUnit, bUnit);
    const expensive = Math.max(aUnit, bUnit);
    return {
      incompatible: false,
      aUnit,
      bUnit,
      resolvedUnit,
      differencePercent: ((expensive - cheaper) / expensive) * 100,
      winner:
        Math.abs(aUnit - bUnit) < 0.01
          ? "Empate técnico"
          : aUnit < bUnit
            ? "Opção A"
            : "Opção B",
    };
  }, [priceA, quantityA, unitA, priceB, quantityB, unitB]);

  return (
    <section className="border-border-subtle bg-surface-muted rounded-xl border p-5">
      <h2 className="text-base font-semibold">Comparador por unidade</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">Opção A</legend>
          <NumberInput label="Preço" value={priceA} onChange={setPriceA} />
          <NumberInput
            label="Quantidade"
            value={quantityA}
            onChange={setQuantityA}
          />
          <UnitSelect label="Unidade" value={unitA} onChange={setUnitA} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold">Opção B</legend>
          <NumberInput label="Preço" value={priceB} onChange={setPriceB} />
          <NumberInput
            label="Quantidade"
            value={quantityB}
            onChange={setQuantityB}
          />
          <UnitSelect label="Unidade" value={unitB} onChange={setUnitB} />
        </fieldset>
      </div>
      {result?.incompatible ? (
        <p className="border-border-subtle bg-background mt-4 rounded-lg border p-4 text-sm">
          Use unidades compatíveis: peso com peso, volume com volume ou unidade
          com unidade.
        </p>
      ) : result ? (
        <div className="border-border-subtle bg-background mt-4 rounded-lg border p-4 text-sm">
          <p>
            Opção A: {formatCurrency(result.aUnit)} por {result.resolvedUnit}.
          </p>
          <p>
            Opção B: {formatCurrency(result.bUnit)} por {result.resolvedUnit}.
          </p>
          <p className="mt-2 font-semibold">
            Melhor custo: {result.winner}
            {result.winner !== "Empate técnico"
              ? `, cerca de ${result.differencePercent.toFixed(1)}% mais barata.`
              : "."}
          </p>
        </div>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm">
          Preencha os quatro campos para comparar. Use a mesma unidade nas duas
          opções: kg com kg, litro com litro, unidade com unidade.
        </p>
      )}
    </section>
  );
}

export function InstallmentComparisonTool() {
  const [cashPrice, setCashPrice] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [installments, setInstallments] = useState("10");

  const result = useMemo(() => {
    const cash = positiveNumber(cashPrice);
    const total = positiveNumber(installmentTotal);
    const count = positiveNumber(installments);
    if (!cash || !total || !count) return null;
    const difference = total - cash;
    return {
      difference,
      percent: (difference / cash) * 100,
      installmentValue: total / count,
    };
  }, [cashPrice, installmentTotal, installments]);

  return (
    <section className="border-border-subtle bg-surface-muted rounded-xl border p-5">
      <h2 className="text-base font-semibold">À vista vs. parcelado</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <NumberInput
          label="Preço à vista"
          value={cashPrice}
          onChange={setCashPrice}
        />
        <NumberInput
          label="Total parcelado"
          value={installmentTotal}
          onChange={setInstallmentTotal}
        />
        <NumberInput
          label="Parcelas"
          value={installments}
          onChange={setInstallments}
        />
      </div>
      {result ? (
        <div className="border-border-subtle bg-background mt-4 rounded-lg border p-4 text-sm">
          <p>Parcela média: {formatCurrency(result.installmentValue)}.</p>
          <p>
            Diferença total:{" "}
            <strong>
              {formatCurrency(Math.abs(result.difference))} (
              {Math.abs(result.percent).toFixed(1)}%)
            </strong>
            .
          </p>
          <p className="text-foreground/60 mt-2">
            Conteúdo educacional; não é aconselhamento financeiro individual.
          </p>
        </div>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm">
          Informe o preço à vista, o total parcelado e a quantidade de parcelas.
        </p>
      )}
    </section>
  );
}

export function RealDiscountTool() {
  const [previousPrice, setPreviousPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  const result = useMemo(() => {
    const previous = positiveNumber(previousPrice);
    const current = positiveNumber(currentPrice);
    if (!previous || !current) return null;
    const drop = previous - current;
    return {
      drop,
      percent: (drop / previous) * 100,
    };
  }, [previousPrice, currentPrice]);

  return (
    <section className="border-border-subtle bg-surface-muted rounded-xl border p-5">
      <h2 className="text-base font-semibold">Calculadora de desconto real</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumberInput
          label="Preço anterior"
          value={previousPrice}
          onChange={setPreviousPrice}
        />
        <NumberInput
          label="Preço atual"
          value={currentPrice}
          onChange={setCurrentPrice}
        />
      </div>
      {result ? (
        <div className="border-border-subtle bg-background mt-4 rounded-lg border p-4 text-sm">
          <p>
            Queda nominal: <strong>{formatCurrency(result.drop)}</strong>.
          </p>
          <p>
            Percentual calculado: <strong>{result.percent.toFixed(1)}%</strong>.
          </p>
          <p className="text-foreground/60 mt-2">
            O preço anterior informado por você não equivale necessariamente ao
            histórico observado pelo PreçoCaindo.
          </p>
        </div>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm">
          Informe preço anterior e preço atual para calcular a queda.
        </p>
      )}
    </section>
  );
}

export function TargetPriceTool() {
  const [usualPrice, setUsualPrice] = useState("");
  const [discount, setDiscount] = useState("15");
  const target = useMemo(() => {
    const price = positiveNumber(usualPrice);
    const percent = positiveNumber(discount);
    if (!price || !percent) return null;
    return price * (1 - percent / 100);
  }, [usualPrice, discount]);

  return (
    <section className="border-border-subtle bg-surface-muted rounded-xl border p-5">
      <h2 className="text-base font-semibold">Calculadora de preço-alvo</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumberInput
          label="Preço normal observado"
          value={usualPrice}
          onChange={setUsualPrice}
        />
        <NumberInput
          label="Desconto desejado (%)"
          value={discount}
          onChange={setDiscount}
        />
      </div>
      {target ? (
        <p className="border-border-subtle bg-background mt-4 rounded-lg border p-4 text-sm">
          Seu preço-alvo aproximado é <strong>{formatCurrency(target)}</strong>.
        </p>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm">
          Informe um preço normal e o desconto que faria a compra valer a pena.
        </p>
      )}
    </section>
  );
}

function UnitSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: UnitKind;
  onChange: (value: UnitKind) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/70">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as UnitKind)}
        className="border-border-subtle focus:border-brand bg-background mt-1 w-full rounded-lg border px-3 py-2 outline-none"
      >
        <option value="g">gramas</option>
        <option value="kg">kg</option>
        <option value="ml">ml</option>
        <option value="l">litros</option>
        <option value="un">unidades</option>
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-foreground/70">{label}</span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-border-subtle focus:border-brand bg-background mt-1 w-full rounded-lg border px-3 py-2 outline-none"
      />
    </label>
  );
}

"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

export function PetLitterCalculator({
  packageWeightKg,
  packagePrice,
  currency = "BRL",
}: {
  packageWeightKg: number;
  packagePrice: number | null;
  currency?: string;
}) {
  const [cats, setCats] = useState(1);
  const [daysPerPackage, setDaysPerPackage] = useState(30);

  const result = useMemo(() => {
    if (packagePrice === null || daysPerPackage <= 0 || cats <= 0) return null;
    const dailyCost = packagePrice / daysPerPackage;
    return {
      dailyCost,
      monthlyCost: dailyCost * 30,
      monthlyPackages: 30 / daysPerPackage,
      monthlyKg: (30 / daysPerPackage) * packageWeightKg,
      costPerCatMonth: (dailyCost * 30) / cats,
    };
  }, [cats, daysPerPackage, packagePrice, packageWeightKg]);

  return (
    <div className="border-border-subtle mt-3 w-full max-w-full overflow-hidden rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-foreground/60 block">
            Gatos usando essa areia
          </span>
          <input
            type="number"
            min="1"
            max="20"
            value={cats}
            onChange={(event) => setCats(Number(event.target.value))}
            className="border-border-subtle bg-background mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-foreground/60 block">
            Dias que um pacote dura
          </span>
          <input
            type="number"
            min="1"
            max="180"
            value={daysPerPackage}
            onChange={(event) => setDaysPerPackage(Number(event.target.value))}
            className="border-border-subtle bg-background mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
      </div>

      {result ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-foreground/50 text-xs">Por mês</dt>
            <dd className="font-semibold">
              {formatCurrency(result.monthlyCost, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/50 text-xs">Por gato/mês</dt>
            <dd className="font-semibold">
              {formatCurrency(result.costPerCatMonth, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/50 text-xs">Pacotes/mês</dt>
            <dd className="font-semibold">
              {result.monthlyPackages.toFixed(1)}
            </dd>
          </div>
          <div>
            <dt className="text-foreground/50 text-xs">Kg/mês</dt>
            <dd className="font-semibold">{result.monthlyKg.toFixed(1)} kg</dd>
          </div>
        </dl>
      ) : (
        <p className="text-foreground/60 mt-4 text-sm">
          Assim que houver preço verificado, esta calculadora estima o custo
          pela sua própria rotina, sem assumir um rendimento fixo.
        </p>
      )}

      <p className="text-foreground/50 mt-3 text-xs leading-relaxed">
        A conta usa os dias informados por você. O PreçoCaindo não presume a
        duração do pacote porque ela varia por número de gatos, caixa e rotina
        de limpeza.
      </p>
    </div>
  );
}

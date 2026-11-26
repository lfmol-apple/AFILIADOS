"use client";

import { useMemo, useState } from "react";
import { BlackFridayPanelRow, type BlackFridayPanelRowProps } from "@/components/black-friday-panel-row";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "PENDING_LINK", label: "Aguardando link" },
  { value: "LINK_PASTED", label: "Colados, não confirmados" },
  { value: "VALIDATED", label: "Validados" },
  { value: "DIVERGENT", label: "Com divergência" },
  { value: "REJECTED", label: "Rejeitados" },
  { value: "MISSING_CREATIVE", label: "Sem criativo" },
] as const;

export function BlackFridayPanelList({ rows }: { rows: BlackFridayPanelRowProps[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "MISSING_CREATIVE") return rows.filter((r) => r.candidates.length === 0);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  function goToNextPending() {
    const next = document.querySelector('[data-pending="true"]');
    next?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium">Filtrar por situação:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border-border-subtle rounded border px-2 py-1 text-xs"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={goToNextPending}
          className="border-border-subtle rounded border px-2 py-1 text-xs"
        >
          Ir para o próximo pendente →
        </button>
        <span className="text-foreground/50 text-xs">{visible.length} produto(s) nesta visão</span>
      </div>

      <div className="mt-3 space-y-3">
        {visible.map((row) => (
          <BlackFridayPanelRow key={row.id} {...row} />
        ))}
      </div>
    </div>
  );
}

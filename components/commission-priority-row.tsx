"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CommissionPriorityRowProps {
  position: number;
  merchantListingId: string;
  externalId: string;
  title: string;
  tierLabel: string;
  score: number;
  evidenceLabel: string;
}

/**
 * One row of the commission-refresh priority queue
 * (lib/services/vitrine-commission-priority.ts). Mercado Livre has no
 * commission API — the owner has to go read the real rate off their own
 * affiliate panel UI by hand, one category at a time (same real
 * limitation documented for link generation, see ml-panel-* files). This
 * row's job is just to make that trip as short as possible: show exactly
 * which product to find on the panel, and a 2-field form to save what
 * was read, through the same panel_pick signal shape every other real
 * commission observation already uses.
 */
export function CommissionPriorityRow(props: CommissionPriorityRowProps) {
  const router = useRouter();
  const [ratePercent, setRatePercent] = useState("");
  const [price, setPrice] = useState("");
  const [isPromotionalExtra, setIsPromotionalExtra] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    const rate = Number(ratePercent.replace(",", "."));
    const priceValue = Number(price.replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
      setMessage("Taxa inválida — digite um número entre 0 e 100.");
      setState("error");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setMessage("Preço inválido.");
      setState("error");
      return;
    }
    setState("saving");
    try {
      const res = await fetch("/api/admin/vitrine-commission-observation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: props.merchantListingId,
          ratePercent: rate,
          price: priceValue,
          isPromotionalExtra,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Não consegui salvar.");
        setState("error");
        return;
      }
      setState("done");
      setMessage("Comissão salva.");
      router.refresh();
    } catch {
      setMessage("Falha de rede ao salvar.");
      setState("error");
    }
  }

  return (
    <li className="border-border-subtle rounded-lg border p-4">
      <p className="text-foreground/60 text-xs">
        #{props.position} · {props.tierLabel} · score {Math.round(props.score)}
      </p>
      <p className="mt-1 font-medium">{props.title}</p>
      <p className="text-foreground/60 mt-1 text-xs">
        ID Mercado Livre: <strong>{props.externalId}</strong> — procure por este
        anúncio (ou pelo título acima) dentro da categoria correspondente no
        painel de afiliados.
      </p>
      <p className="text-foreground/50 mt-1 text-xs">{props.evidenceLabel}</p>

      {state === "done" ? (
        <p className="mt-2 text-sm text-emerald-700">{message}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Taxa % (ex.: 8)"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            className="border-border-subtle w-28 rounded border px-2 py-1 text-sm"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Preço no painel (R$)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border-border-subtle w-36 rounded border px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={isPromotionalExtra}
              onChange={(e) => setIsPromotionalExtra(e.target.checked)}
            />
            Ganhos extras (campanha temporária)
          </label>
          <button
            type="button"
            onClick={save}
            disabled={state === "saving"}
            className="bg-brand text-brand-foreground rounded px-3 py-1 text-sm font-semibold disabled:opacity-50"
          >
            {state === "saving" ? "Salvando…" : "Salvar comissão lida"}
          </button>
          {state === "error" && <p className="w-full text-xs text-red-600">{message}</p>}
        </div>
      )}
    </li>
  );
}

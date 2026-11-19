"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VitrineAdSpendForm() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/vitrine-ad-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spentOn: form.get("spentOn"),
          amountBrl: Number(form.get("amountBrl")),
          note: form.get("note") || undefined,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setState("idle");
        setMessage(data.error ?? "Não foi possível salvar.");
        return;
      }
      setState("done");
      setMessage("Investimento registrado.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-border-subtle flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <label className="text-xs">
        Data
        <input name="spentOn" type="date" required className="border-border-subtle mt-1 block rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs">
        Valor investido (R$)
        <input name="amountBrl" type="number" min="0" step="0.01" required className="border-border-subtle mt-1 block w-32 rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs flex-1">
        Observação
        <input name="note" type="text" className="border-border-subtle mt-1 block w-full rounded border px-2 py-1 text-sm" />
      </label>
      <button type="submit" disabled={state === "saving"} className="bg-brand text-brand-foreground rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
        {state === "saving" ? "Salvando…" : "Registrar investimento"}
      </button>
      {message && <p className="text-xs text-foreground/60 basis-full">{message}</p>}
    </form>
  );
}

export function VitrineCommissionForm() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/vitrine-commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: form.get("periodStart"),
          periodEnd: form.get("periodEnd"),
          directAmountBrl: Number(form.get("directAmountBrl") || 0),
          indirectAmountBrl: Number(form.get("indirectAmountBrl") || 0),
          status: form.get("status"),
          note: form.get("note") || undefined,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setState("idle");
        setMessage(data.error ?? "Não foi possível salvar.");
        return;
      }
      setState("done");
      setMessage("Comissão registrada.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-border-subtle mt-3 flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <label className="text-xs">
        Início do período
        <input name="periodStart" type="date" required className="border-border-subtle mt-1 block rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs">
        Fim do período
        <input name="periodEnd" type="date" required className="border-border-subtle mt-1 block rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs">
        Comissão direta (R$)
        <input name="directAmountBrl" type="number" min="0" step="0.01" className="border-border-subtle mt-1 block w-28 rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs">
        Comissão indireta (R$)
        <input name="indirectAmountBrl" type="number" min="0" step="0.01" className="border-border-subtle mt-1 block w-28 rounded border px-2 py-1 text-sm" />
      </label>
      <label className="text-xs">
        Status
        <select name="status" required className="border-border-subtle mt-1 block rounded border px-2 py-1 text-sm">
          <option value="PENDING">Pendente (dentro dos 60 dias)</option>
          <option value="APPROVED">Aprovada</option>
        </select>
      </label>
      <label className="text-xs flex-1">
        Observação
        <input name="note" type="text" className="border-border-subtle mt-1 block w-full rounded border px-2 py-1 text-sm" />
      </label>
      <button type="submit" disabled={state === "saving"} className="bg-brand text-brand-foreground rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
        {state === "saving" ? "Salvando…" : "Registrar comissão"}
      </button>
      {message && <p className="text-xs text-foreground/60 basis-full">{message}</p>}
    </form>
  );
}

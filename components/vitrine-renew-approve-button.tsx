"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Owner's authorization, 2026-11-22 ("Operação Cérebro Comercial", item
 * 2): explicit, two-step approval — a plain click is not enough for an
 * action that writes real ACTIVE/RETIRED rows to the real Vitrine
 * Geral. `window.confirm` is a deliberate second gate, not decoration.
 */
export function VitrineRenewApproveButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onApprove() {
    const confirmed = window.confirm(
      "Isso vai aplicar a renovação real da Vitrine Geral agora (o mesmo job que o cron rodaria), respeitando o orçamento de rotação e a proteção de observação mínima. Confirma?",
    );
    if (!confirmed) return;

    setState("running");
    setMessage("");
    try {
      const response = await fetch("/api/admin/vitrine-renew-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; counters?: Record<string, number> };
      if (!response.ok) {
        setState("error");
        setMessage(data.error ?? "Falha ao aplicar.");
        return;
      }
      setState("done");
      setMessage(`Aplicado: ${JSON.stringify(data.counters)}`);
      router.refresh();
    } catch {
      setState("error");
      setMessage("Falha de rede.");
    }
  }

  return (
    <div>
      <button
        onClick={onApprove}
        disabled={state === "running"}
        className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {state === "running" ? "Aplicando…" : "Aprovar e aplicar a renovação real"}
      </button>
      {message && <p className="text-foreground/60 mt-2 text-xs">{message}</p>}
    </div>
  );
}

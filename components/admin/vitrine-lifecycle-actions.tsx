"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VitrineStatus } from "@/lib/services/vitrine-manager";

/** Owner's authorization, 2026-11-22 ("Pausa, reativação e
 * encerramento"). One button per REAL allowed transition from the
 * current status — never shows a button for a transition the server
 * would reject anyway (DRAFT/PAUSED -> ACTIVE via "Ativar"/"Reativar",
 * ACTIVE -> PAUSED, DRAFT/ACTIVE/PAUSED -> ENDED). "Aplicar seleção
 * comercial" is a SEPARATE action, only shown once ACTIVE — activating
 * never auto-selects anything (owner's rule: "a criação de uma vitrine
 * não deve automaticamente criar anúncios na Meta", extended here to
 * "ativar não seleciona automaticamente"). */
export function VitrineLifecycleActions({ vitrineId, status }: { vitrineId: string; status: VitrineStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "activate" | "pause" | "end" | "claim") {
    setBusy(action);
    setMessage(null);
    const res = await fetch(`/api/admin/vitrines/${vitrineId}/${action}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(`Erro: ${body.error ?? "desconhecido"}`);
      return;
    }
    if (action === "claim") {
      setMessage(`Seleção aplicada: ${body.claimed} produto(s) reservado(s), ${body.lostRace} perderam a concorrência real no momento da escrita, ${body.blockedByOtherVitrine} já estavam em outra vitrine.`);
    } else if (action === "pause" || action === "end") {
      setMessage(action === "pause" ? "Vitrine pausada — produtos permanecem reservados." : `Vitrine encerrada — ${body.releasedCount} produto(s) liberado(s) para outras vitrines.`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(status === "DRAFT" || status === "PAUSED") && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act("activate")}
            className="bg-brand text-brand-foreground min-h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-50"
          >
            {status === "DRAFT" ? "Ativar" : "Reativar"}
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act("claim")}
            className="bg-brand text-brand-foreground min-h-10 rounded-full px-4 text-sm font-semibold disabled:opacity-50"
          >
            Aplicar seleção comercial
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => act("pause")}
            className="border-border-subtle min-h-10 rounded-full border px-4 text-sm font-semibold disabled:opacity-50"
          >
            Pausar
          </button>
        )}
        {status !== "ENDED" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (confirm("Encerrar esta vitrine? Isso libera seus produtos para outras vitrines e não pode ser desfeito.")) act("end");
            }}
            className="min-h-10 rounded-full border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            Encerrar
          </button>
        )}
      </div>
      {message && <p className="text-foreground/70 text-sm">{message}</p>}
    </div>
  );
}

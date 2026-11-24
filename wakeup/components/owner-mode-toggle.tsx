"use client";

import { useState } from "react";

/**
 * Turns owner mode on/off for THIS browser (calls /api/admin/owner-mark).
 * `initiallyOn` comes from the server, which already read the cookie —
 * this component only handles the click and the page's own reload, so the
 * server re-reads the real state afterward instead of the UI guessing it.
 */
export function OwnerModeToggle({
  initiallyOn,
  initialExpiresAt,
}: {
  initiallyOn: boolean;
  initialExpiresAt: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/owner-mark", {
        method: initiallyOn ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setError("Não consegui salvar. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {initiallyOn
              ? "Ativado neste navegador"
              : "Desativado neste navegador"}
          </p>
          <p className="text-foreground/60 mt-1 text-xs">
            {initiallyOn && initialExpiresAt
              ? `Suas visitas e cliques neste navegador não entram nos relatórios até ${new Date(initialExpiresAt).toLocaleDateString("pt-BR")}.`
              : "Enquanto desativado, sua navegação normal (fora do /admin) conta como visita de verdade."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${
            initiallyOn
              ? "border-border-subtle hover:border-brand border"
              : "bg-brand text-brand-foreground"
          }`}
        >
          {busy ? "Salvando…" : initiallyOn ? "Desativar" : "Ativar modo dono"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

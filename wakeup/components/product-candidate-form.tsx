"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SCORE_FIELDS = [
  ["searchPotential", "Potencial de busca"],
  ["purchaseIntent", "Intenção de compra"],
  ["ticketSize", "Ticket médio"],
  ["commissionEstimate", "Comissão estimada"],
  ["longTailOpportunity", "Oportunidade cauda longa"],
  ["seoCompetitiveness", "Competitividade SEO"],
  ["valuePropositionFit", "Encaixe da proposta"],
  ["clickProbability", "Probabilidade de clique"],
] as const;

/**
 * The admin-UI replacement for typing `npm run candidate:add` by hand —
 * same validation underneath (lib/services/candidate-registration.ts).
 * On success, calls router.refresh() (unlike the ML queue item) because
 * adding a candidate doesn't remove anything else from the list — no
 * reordering-mid-session risk here, the new card just needs to appear.
 */
export function ProductCandidateForm() {
  const router = useRouter();
  const [asin, setAsin] = useState("");
  const [workingTitle, setWorkingTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [categoryHint, setCategoryHint] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const numericScores: Record<string, number> = {};
      for (const [key, raw] of Object.entries(scores)) {
        if (raw.trim() === "") continue;
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          setError(`${key}: precisa ser um inteiro entre 0 e 100.`);
          setPending(false);
          return;
        }
        numericScores[key] = n;
      }

      const response = await fetch("/api/admin/product-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin,
          marketplace: "BR",
          workingTitle,
          rationale,
          categoryHint: categoryHint.trim() || undefined,
          ...numericScores,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Falha ao registrar candidato.");
        return;
      }
      setAsin("");
      setWorkingTitle("");
      setRationale("");
      setCategoryHint("");
      setScores({});
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand text-brand-foreground mb-3 min-h-9 rounded-full px-4 text-xs font-semibold"
      >
        + Novo candidato Amazon
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border-subtle mb-4 space-y-2 rounded-lg border p-4"
    >
      <input
        type="text"
        value={asin}
        onChange={(e) => setAsin(e.target.value)}
        placeholder="ASIN (ex: B0EXAMPLE1)"
        required
        className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
      />
      <input
        type="text"
        value={workingTitle}
        onChange={(e) => setWorkingTitle(e.target.value)}
        placeholder="Título de trabalho"
        required
        className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
      />
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Justificativa — por que vale a pena avaliar este ASIN"
        rows={2}
        required
        className="border-border-subtle w-full rounded-md border px-3 py-2 text-xs"
      />
      <input
        type="text"
        value={categoryHint}
        onChange={(e) => setCategoryHint(e.target.value)}
        placeholder="Categoria sugerida (slug, opcional)"
        className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
      />
      <details className="text-xs">
        <summary className="text-foreground/60 cursor-pointer">
          Notas heurísticas (opcionais, 0-100)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SCORE_FIELDS.map(([key, label]) => (
            <input
              key={key}
              type="number"
              min={0}
              max={100}
              value={scores[key] ?? ""}
              onChange={(e) => setScores((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={label}
              title={label}
              className="border-border-subtle min-h-9 w-full rounded-md border px-2 text-xs"
            />
          ))}
        </div>
      </details>
      {error && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-brand-foreground min-h-9 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Registrar candidato"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-foreground/50 min-h-9 rounded-full px-3 text-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

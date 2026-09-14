"use client";

import { useState } from "react";

export interface ProductCandidateItemProps {
  id: string;
  asin: string;
  marketplace: string;
  workingTitle: string;
  categoryHint: string | null;
  slugHint: string | null;
  rationale: string;
  status: "CANDIDATE" | "APPROVED";
  scores: {
    searchPotential: number | null;
    purchaseIntent: number | null;
    ticketSize: number | null;
    commissionEstimate: number | null;
    longTailOpportunity: number | null;
    seoCompetitiveness: number | null;
    valuePropositionFit: number | null;
    clickProbability: number | null;
  };
  categoryOptions: { slug: string; name: string }[];
}

const SCORE_LABELS: Record<keyof ProductCandidateItemProps["scores"], string> = {
  searchPotential: "Busca",
  purchaseIntent: "Intenção",
  ticketSize: "Ticket",
  commissionEstimate: "Comissão",
  longTailOpportunity: "Cauda longa",
  seoCompetitiveness: "SEO",
  valuePropositionFit: "Proposta",
  clickProbability: "Clique",
};

export function ProductCandidateItem(props: ProductCandidateItemProps) {
  const [status, setStatus] = useState(props.status);
  const [removed, setRemoved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState(false);

  const [title, setTitle] = useState(props.workingTitle);
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState(props.categoryHint ?? "");
  const [brand, setBrand] = useState("");

  async function changeStatus(next: "APPROVED" | "REJECTED") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/product-candidates/${props.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Falha ao atualizar status.");
        return;
      }
      if (next === "REJECTED") setRemoved(true);
      else setStatus("APPROVED");
    } finally {
      setPending(false);
    }
  }

  async function promote() {
    if (!description.trim() || !categorySlug.trim() || !title.trim()) {
      setError("Título, descrição e categoria são obrigatórios pra promover.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/product-candidates/${props.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categorySlug,
          brand: brand.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Falha ao promover.");
        return;
      }
      setRemoved(true);
    } finally {
      setPending(false);
    }
  }

  if (removed) return null;

  const scoreEntries = Object.entries(props.scores).filter(([, v]) => v !== null) as [
    keyof ProductCandidateItemProps["scores"],
    number,
  ][];

  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{props.workingTitle}</p>
          <p className="text-foreground/50 text-xs">
            ASIN {props.asin} · {props.marketplace}
            {props.categoryHint && ` · ${props.categoryHint}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "APPROVED"
              ? "bg-brand text-brand-foreground"
              : "border-border-subtle border"
          }`}
        >
          {status === "APPROVED" ? "Aprovado" : "Candidato"}
        </span>
      </div>

      <p className="text-foreground/70 mt-2 text-xs">{props.rationale}</p>

      {scoreEntries.length > 0 && (
        <dl className="text-foreground/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {scoreEntries.map(([key, value]) => (
            <div key={key}>
              {SCORE_LABELS[key]}: {value}
            </div>
          ))}
        </dl>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {status === "CANDIDATE" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeStatus("APPROVED")}
            disabled={pending}
            className="bg-brand text-brand-foreground min-h-9 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => changeStatus("REJECTED")}
            disabled={pending}
            className="text-foreground/50 hover:text-rose-600 dark:hover:text-rose-400 min-h-9 rounded-full px-3 text-xs font-medium disabled:opacity-50"
          >
            Rejeitar
          </button>
        </div>
      )}

      {status === "APPROVED" && !showPromote && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPromote(true)}
            className="bg-brand text-brand-foreground min-h-9 rounded-full px-4 text-xs font-semibold"
          >
            Promover a produto real
          </button>
        </div>
      )}

      {status === "APPROVED" && showPromote && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void promote();
          }}
          className="border-border-subtle mt-3 space-y-2 rounded-md border p-3"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título público real"
            className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição editorial (nunca copiada da Amazon)"
            rows={3}
            className="border-border-subtle w-full rounded-md border px-3 py-2 text-xs"
          />
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
          >
            <option value="">Selecione a categoria...</option>
            {props.categoryOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca (opcional)"
            className="border-border-subtle min-h-9 w-full rounded-md border px-3 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand text-brand-foreground min-h-9 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
            >
              {pending ? "Promovendo..." : "Confirmar promoção"}
            </button>
            <button
              type="button"
              onClick={() => setShowPromote(false)}
              className="text-foreground/50 min-h-9 rounded-full px-3 text-xs"
            >
              Cancelar
            </button>
          </div>
          <p className="text-foreground/50 text-xs">
            Cria o produto como rascunho (inativo) — ativar publicamente
            continua sendo um passo manual separado (`product:activate`).
          </p>
        </form>
      )}
    </div>
  );
}

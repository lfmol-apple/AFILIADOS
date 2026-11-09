"use client";

import { useState } from "react";
import type { AmazonMatchQueueRow } from "@/lib/queries/amazon-match-queue";

interface Row extends AmazonMatchQueueRow {
  suggestedCategorySlug: string;
}

const CATEGORY_OPTIONS = [
  { slug: "esporte-suplementos", label: "Esporte e Suplementos" },
  { slug: "celulares", label: "Celulares e Acessórios" },
  { slug: "audio-games", label: "Áudio, TV e Games" },
  { slug: "informatica", label: "Informática e Impressão 3D" },
  { slug: "eletrodomesticos", label: "Eletrodomésticos" },
  { slug: "casa", label: "Casa e Decoração" },
  { slug: "limpeza", label: "Limpeza e Papel" },
  { slug: "beleza", label: "Beleza e Cuidados" },
  { slug: "bebe", label: "Bebê" },
  { slug: "pet", label: "Pet" },
  { slug: "ferramentas", label: "Ferramentas e Jardim" },
  { slug: "moda", label: "Moda e Acessórios" },
  { slug: "automotivo", label: "Automotivo e Moto" },
  { slug: "alimentos", label: "Alimentos e Bebidas" },
  { slug: "musica", label: "Instrumentos Musicais" },
  { slug: "brinquedos-festas", label: "Brinquedos e Festas" },
  { slug: "outros", label: "Outros" },
];

function RowCard({
  row,
  onDone,
}: {
  row: Row;
  onDone: (merchantListingId: string) => void;
}) {
  const [asin, setAsin] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [categorySlug, setCategorySlug] = useState(row.suggestedCategorySlug);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(
    body:
      | { merchantListingId: string; decision: "NO_MATCH" }
      | {
          merchantListingId: string;
          decision: "MATCHED";
          asin: string;
          title: string;
          brand?: string;
          categorySlug: string;
          description: string;
        },
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/amazon-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Falha ao salvar.");
        setBusy(false);
        return;
      }
      onDone(row.merchantListingId);
    } catch {
      setError("Falha de rede — tente de novo.");
      setBusy(false);
    }
  }

  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="flex gap-3">
        {row.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.imageUrl}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-foreground/50 text-xs">
            {row.merchant === "MERCADO_LIVRE" ? "Mercado Livre" : "Shopee"}
          </p>
          <p className="text-sm font-medium">{row.title}</p>
          <a
            href={row.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand mt-1 inline-block text-xs underline"
          >
            Buscar na Amazon →
          </a>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={asin}
          onChange={(e) => setAsin(e.target.value.trim().toUpperCase())}
          placeholder="ASIN (ex: B0F63SVC3T)"
          className="border-border-subtle rounded border px-2 py-1.5 text-sm"
        />
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="border-border-subtle rounded border px-2 py-1.5 text-sm"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título exato do produto NA AMAZON (nunca o título original do anúncio)"
          className="border-border-subtle rounded border px-2 py-1.5 text-sm sm:col-span-2"
        />
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marca (opcional)"
          className="border-border-subtle rounded border px-2 py-1.5 text-sm sm:col-span-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Descrição editorial PRÓPRIA deste produto (o que é, pra quem serve, o que checar antes de comprar) — nunca o mesmo texto genérico em dois produtos"
          className="border-border-subtle rounded border px-2 py-1.5 text-sm sm:col-span-2"
        />
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          disabled={busy || !asin || title.trim().length < 5 || description.trim().length < 25}
          onClick={() =>
            submit({
              merchantListingId: row.merchantListingId,
              decision: "MATCHED",
              asin,
              title,
              brand: brand || undefined,
              categorySlug,
              description,
            })
          }
          className="bg-brand text-brand-foreground rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Confirmar correspondência
        </button>
        <button
          disabled={busy}
          onClick={() =>
            submit({ merchantListingId: row.merchantListingId, decision: "NO_MATCH" })
          }
          className="border-border-subtle rounded-full border px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Sem correspondência
        </button>
      </div>
    </div>
  );
}

export function AmazonMatchQueueClient({
  initialRows,
}: {
  initialRows: Row[];
}) {
  const [rows, setRows] = useState(initialRows);

  function handleDone(merchantListingId: string) {
    setRows((prev) => prev.filter((r) => r.merchantListingId !== merchantListingId));
  }

  if (rows.length === 0) {
    return (
      <p className="text-foreground/60 mt-6 text-sm">
        Nada pendente neste lote — recarregue a página pra buscar o próximo.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {rows.map((row) => (
        <RowCard key={row.merchantListingId} row={row} onDone={handleDone} />
      ))}
    </div>
  );
}

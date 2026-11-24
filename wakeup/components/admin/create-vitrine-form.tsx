"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Owner's authorization, 2026-11-22 ("Criação e edição de vitrines —
 * nome, slug, finalidade... quantidade máxima"). Same explicit-form,
 * POST-then-refresh pattern as every other admin mutation form in this
 * project. */
export function CreateVitrineForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const maxProductsRaw = form.get("maxProducts");
    const res = await fetch("/api/admin/vitrines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.get("slug"),
        name: form.get("name"),
        purpose: form.get("purpose") || undefined,
        maxProducts: maxProductsRaw ? Number(maxProductsRaw) : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
      setError(body.error ?? "Erro desconhecido.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-brand text-brand-foreground min-h-11 rounded-full px-5 text-sm font-semibold"
      >
        + Criar nova vitrine
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border-border-subtle bg-surface mt-4 space-y-3 rounded-2xl border p-4 text-sm">
      <div>
        <label className="block font-medium">Nome</label>
        <input name="name" required maxLength={120} className="border-border-subtle mt-1 w-full rounded-lg border px-3 py-2" />
      </div>
      <div>
        <label className="block font-medium">Slug (URL pública: /vitrine/SLUG)</label>
        <input
          name="slug"
          required
          maxLength={60}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="casa-inteligente"
          className="border-border-subtle mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>
      <div>
        <label className="block font-medium">Finalidade (opcional, descritivo — nunca filtra a seleção real)</label>
        <textarea name="purpose" maxLength={500} className="border-border-subtle mt-1 w-full rounded-lg border px-3 py-2" />
      </div>
      <div>
        <label className="block font-medium">Quantidade máxima de produtos (padrão 30)</label>
        <input name="maxProducts" type="number" min={1} max={100} className="border-border-subtle mt-1 w-32 rounded-lg border px-3 py-2" />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="bg-brand text-brand-foreground min-h-10 rounded-full px-5 font-semibold">
          {submitting ? "Criando…" : "Criar (rascunho)"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="border-border-subtle min-h-10 rounded-full border px-5">
          Cancelar
        </button>
      </div>
    </form>
  );
}

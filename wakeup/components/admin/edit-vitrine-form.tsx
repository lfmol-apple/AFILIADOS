"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Owner's authorization, 2026-11-22 ("Criação e edição de vitrines").
 * Metadata-only (name/purpose/maxProducts) — never touches a single
 * VitrineSelection row, see app/api/admin/vitrines/[id]/route.ts's own
 * doc comment. Safe to show regardless of the vitrine's status. */
export function EditVitrineForm({
  vitrine,
}: {
  vitrine: { id: string; name: string; purpose: string | null; maxProducts: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/vitrines/${vitrine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        purpose: form.get("purpose") || null,
        maxProducts: Number(form.get("maxProducts")),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
      setError(body.error ?? "Erro desconhecido.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="border-border-subtle min-h-9 rounded-full border px-4 text-xs font-semibold">
        Editar nome/finalidade/quantidade
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border-border-subtle bg-surface space-y-3 rounded-2xl border p-4">
      <div>
        <label className="block font-medium">Nome</label>
        <input name="name" defaultValue={vitrine.name} required maxLength={120} className="border-border-subtle mt-1 w-full rounded-lg border px-3 py-2" />
      </div>
      <div>
        <label className="block font-medium">Finalidade</label>
        <textarea name="purpose" defaultValue={vitrine.purpose ?? ""} maxLength={500} className="border-border-subtle mt-1 w-full rounded-lg border px-3 py-2" />
      </div>
      <div>
        <label className="block font-medium">Quantidade máxima de produtos</label>
        <input name="maxProducts" type="number" min={1} max={100} defaultValue={vitrine.maxProducts} className="border-border-subtle mt-1 w-32 rounded-lg border px-3 py-2" />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="bg-brand text-brand-foreground min-h-10 rounded-full px-5 font-semibold">
          {submitting ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="border-border-subtle min-h-10 rounded-full border px-5">
          Cancelar
        </button>
      </div>
    </form>
  );
}

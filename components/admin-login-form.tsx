"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Posts to /api/admin/login and refreshes the page on success so the
 * server component re-evaluates the (now-valid) session cookie — no
 * client-side session state is kept here. */
export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Falha no login.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de rede. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="text-foreground/60 mt-2 text-sm">
        Este painel exige autenticação.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label htmlFor="admin-password" className="sr-only">
          Senha
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="border-border-subtle bg-background focus:border-brand w-full rounded-lg border px-3 py-2 text-sm outline-none"
        />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-brand-foreground w-full rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

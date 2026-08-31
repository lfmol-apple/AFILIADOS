"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

export function PriceAlertForm({
  productId,
  currentPrice,
  currency,
  enabled,
}: {
  productId: string;
  currentPrice: number | null;
  currency: string;
  enabled: boolean;
}) {
  const suggestedTarget = currentPrice
    ? Math.round(currentPrice * 0.9 * 100) / 100
    : "";
  const [targetPrice, setTargetPrice] = useState(String(suggestedTarget));
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        targetPrice: Number(targetPrice),
        contact,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      setStatus("error");
      setMessage(data.error ?? "Não foi possível criar o alerta agora.");
      return;
    }

    setStatus("success");
    setMessage(data.message ?? "Alerta criado para confirmação.");
  }

  if (!enabled) {
    return (
      <section className="border-border-subtle bg-surface-muted rounded-xl border p-5">
        <h2 className="text-base font-semibold">
          Quer esperar um preço melhor?
        </h2>
        <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
          Os alertas por e-mail ainda estão desativados neste ambiente. Quando o
          envio estiver configurado, você poderá definir um preço-alvo e receber
          confirmação por e-mail sem criar conta.
        </p>
      </section>
    );
  }

  return (
    <section className="border-border-subtle rounded-xl border p-5">
      <h2 className="text-base font-semibold">Quer esperar um preço melhor?</h2>
      <p className="text-foreground/70 mt-2 text-sm">
        Informe seu preço-alvo e e-mail. O alerta só passa a valer depois da
        confirmação.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={submit}
      >
        <label className="block text-sm">
          <span className="text-foreground/70">Preço desejado</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            className="border-border-subtle focus:border-brand bg-background mt-1 w-full rounded-lg border px-3 py-2 outline-none"
            placeholder={
              currentPrice
                ? formatCurrency(currentPrice * 0.9, currency)
                : "Ex.: 199,90"
            }
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">E-mail</span>
          <input
            type="email"
            required
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="border-border-subtle focus:border-brand bg-background mt-1 w-full rounded-lg border px-3 py-2 outline-none"
            placeholder="voce@email.com"
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-brand text-brand-foreground self-end rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Criar alerta
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${status === "error" ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-300"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  );
}

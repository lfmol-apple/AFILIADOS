"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LINKBUILDER_URL = "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";

/**
 * One row = one trending ML keyword. Deliberately two actions only (owner's
 * brief, 2026-11-15: "só o de copiar uma vez e colar outra vez"): one
 * button copies the term and opens Linkbuilder; pasting the affiliate link
 * back registers it immediately — no separate "check" or "save" click.
 */
export function TrendingTermRow({ keyword, url }: { keyword: string; url: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  async function copyAndOpen() {
    try {
      await navigator.clipboard.writeText(keyword);
      setMessage("Termo copiado. Cole na busca do Linkbuilder.");
    } catch {
      setMessage("Não consegui copiar — copie o termo manualmente.");
    }
    window.open(LINKBUILDER_URL, "_blank", "noopener");
  }

  async function register(affiliateUrl: string) {
    if (!affiliateUrl.trim() || state !== "idle") return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-trending/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, affiliateUrl: affiliateUrl.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        title?: string | null;
      };
      if (!response.ok) {
        setState("idle");
        setMessage(data.error ?? "Não foi possível registrar.");
        return;
      }
      setState("done");
      setMessage(`Salvo: ${data.title ?? keyword}`);
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede. Tente de novo.");
    }
  }

  return (
    <li className="border-border-subtle flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{keyword}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand mt-0.5 inline-block text-xs underline underline-offset-2"
        >
          ver no Mercado Livre →
        </a>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void copyAndOpen()}
          disabled={state !== "idle"}
          className="border-border-subtle hover:border-brand min-h-9 rounded-lg border px-3 text-xs font-medium disabled:opacity-50"
        >
          1. Copiar termo + abrir Linkbuilder →
        </button>
        <input
          type="url"
          disabled={state !== "idle"}
          placeholder="2. Cole aqui o link gerado"
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text").trim();
            if (/^https?:\/\//.test(pasted)) {
              e.preventDefault();
              void register(pasted);
            }
          }}
          className="border-border-subtle bg-surface-muted min-h-9 w-full rounded-lg border px-3 text-xs sm:max-w-xs"
        />
      </div>
      {message && (
        <p
          className={`text-xs sm:ml-3 ${state === "done" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground/60"}`}
        >
          {state === "saving" ? "Registrando…" : message}
        </p>
      )}
    </li>
  );
}

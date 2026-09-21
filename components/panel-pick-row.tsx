"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PanelPickRowProps {
  position: number;
  id: string;
  repeated: boolean;
  title: string;
  rateLabel: string;
  extras: boolean;
  earningLabel: string;
  soldLabel: string;
  priceLabel: string;
  notes: string[];
  recommended: boolean;
}

/** One product of the link list: shows the numbers and takes the pasted link. */
export function PanelPickRow(props: PanelPickRowProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    if (!url.trim() || state === "saving") return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-panel-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, affiliateUrl: url.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        title?: string | null;
      };
      if (!response.ok || !data.ok) {
        setState("idle");
        setMessage(data.error ?? "Não foi possível salvar.");
        return;
      }
      setState("done");
      setMessage(`Salvo${data.title ? `: ${data.title}` : ""}`);
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede. Tente de novo.");
    }
  }

  return (
    <li
      className={`border-border-subtle rounded-xl border p-3 ${props.recommended ? "" : "opacity-80"}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <span className="text-foreground/50 font-semibold">
          #{props.position}
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          {props.earningLabel} por venda
        </span>
        <span>
          {props.rateLabel}
          {props.extras ? " ⚡" : ""}
        </span>
        <span className="text-foreground/60">{props.soldLabel}</span>
        <span className="text-foreground/60">{props.priceLabel}</span>
      </div>
      <p className="mt-1 text-sm font-medium">
        {props.title}
        {props.repeated && (
          <span className="text-foreground/50 ml-2 text-xs font-normal">
            (colado mais de uma vez)
          </span>
        )}
      </p>
      {props.notes.length > 0 && (
        <p className="text-foreground/60 mt-0.5 text-xs">
          {props.notes.join(" · ")}
        </p>
      )}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text").trim();
            if (/^https?:\/\//.test(pasted)) {
              setUrl(pasted);
            }
          }}
          disabled={state !== "idle"}
          placeholder="Cole aqui o link gerado (meli.la/... ou mercadolivre.com/sec/...)"
          className="border-border-subtle bg-surface-muted min-h-10 w-full rounded-lg border px-3 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={state !== "idle" || !url.trim()}
          className="bg-brand text-brand-foreground min-h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
        >
          {state === "saving" ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {message && (
        <p
          className={`mt-1 text-xs ${state === "done" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}
        >
          {message}
        </p>
      )}
    </li>
  );
}

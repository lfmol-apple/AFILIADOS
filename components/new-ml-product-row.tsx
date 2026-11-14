"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LINKBUILDER_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";

export function NewMlProductRow({
  merchantListingId,
  title,
  imageUrl,
  productUrl,
}: {
  merchantListingId: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  async function openTool() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setMessage("Endereço copiado. Cole no Linkbuilder.");
    } catch {
      setMessage("Não consegui copiar — copie o endereço manualmente.");
    }
    window.open(LINKBUILDER_URL, "_blank", "noopener");
  }

  async function save() {
    if (!url.trim() || state === "saving") return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-affiliate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantListingId, affiliateUrl: url.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setState("idle");
        setMessage(data.error ?? "Não foi possível salvar.");
        return;
      }
      setState("done");
      setMessage("Salvo!");
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede. Tente de novo.");
    }
  }

  return (
    <li className="border-border-subtle flex gap-3 rounded-xl border p-3">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="bg-surface-muted h-16 w-16 shrink-0 rounded-lg object-contain"
        />
      ) : (
        <div className="bg-surface-muted h-16 w-16 shrink-0 rounded-lg" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand mt-0.5 inline-block text-xs underline underline-offset-2"
        >
          ver no Mercado Livre →
        </a>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={openTool}
            className="border-border-subtle hover:border-brand min-h-9 rounded-lg border px-3 text-xs font-medium"
          >
            1. Copiar endereço + abrir Linkbuilder →
          </button>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setMessage("");
            }}
            disabled={state !== "idle"}
            placeholder="2. Cole o link gerado aqui"
            className="border-border-subtle bg-surface-muted min-h-9 w-full rounded-lg border px-3 text-xs sm:max-w-xs"
          />
          <button
            type="button"
            onClick={save}
            disabled={state !== "idle" || !url.trim()}
            className="bg-brand text-brand-foreground min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
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
      </div>
    </li>
  );
}

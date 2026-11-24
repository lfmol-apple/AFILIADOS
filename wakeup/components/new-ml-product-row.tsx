"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LINKBUILDER_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";

interface LinkCheck {
  status: "match" | "likely" | "mismatch" | "unknown" | "duplicate" | "invalid";
  message: string;
  linkTitle: string | null;
  profileOk: boolean | null;
}

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
  const [state, setState] = useState<
    "idle" | "checking" | "saving" | "dismissing" | "done"
  >("idle");
  const [message, setMessage] = useState("");
  const [check, setCheck] = useState<LinkCheck | null>(null);

  async function dismiss() {
    if (state !== "idle") return;
    if (
      !window.confirm(
        "Descartar este produto? É pra quando o Linkbuilder diz que ele está pausado ou não cumpre os requisitos do programa. Reversível, mas sai da lista.",
      )
    )
      return;
    setState("dismissing");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-affiliate-links/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantListingId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setState("idle");
        setMessage(data.error ?? "Não foi possível descartar.");
        return;
      }
      setState("done");
      setMessage("Descartado.");
      router.refresh();
    } catch {
      setState("idle");
      setMessage("Falha de rede. Tente de novo.");
    }
  }

  async function openTool() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setMessage("Endereço copiado. Cole no Linkbuilder.");
    } catch {
      setMessage("Não consegui copiar — copie o endereço manualmente.");
    }
    window.open(LINKBUILDER_URL, "_blank", "noopener");
  }

  async function runCheck(value: string): Promise<LinkCheck | null> {
    setState("checking");
    setMessage("");
    setCheck(null);
    try {
      const response = await fetch("/api/admin/new-ml-products/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantListingId, affiliateUrl: value.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        check?: LinkCheck;
      };
      setState("idle");
      if (!response.ok || !data.check) {
        setMessage(data.error ?? "Não consegui conferir o link.");
        return null;
      }
      setCheck(data.check);
      return data.check;
    } catch {
      setState("idle");
      setMessage("Falha de rede ao conferir. Tente de novo.");
      return null;
    }
  }

  async function save(value: string = url, force = false) {
    if (!value.trim() || state === "saving") return;
    if (!force) {
      const result = check ?? (await runCheck(value));
      if (!result || result.status === "duplicate" || result.status === "invalid") return;
      if (result.status === "mismatch") {
        const ok = window.confirm(
          "O link parece ser de OUTRO produto. Salvar mesmo assim?",
        );
        if (!ok) return;
      }
    }
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-affiliate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantListingId, affiliateUrl: value.trim() }),
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

  async function checkThenSave(value: string) {
    const result = await runCheck(value);
    if (result?.status === "match") await save(value, true);
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
              setCheck(null);
              setMessage("");
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              if (/^https?:\/\//.test(pasted)) {
                e.preventDefault();
                setUrl(pasted);
                void checkThenSave(pasted);
              }
            }}
            disabled={state !== "idle"}
            placeholder="2. Cole o link gerado aqui"
            className="border-border-subtle bg-surface-muted min-h-9 w-full rounded-lg border px-3 text-xs sm:max-w-xs"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={state !== "idle" || !url.trim()}
            className="bg-brand text-brand-foreground min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
          >
            {state === "checking"
              ? "Conferindo…"
              : state === "saving"
                ? "Salvando…"
                : "Conferir e salvar"}
          </button>
          <button
            type="button"
            onClick={() => void dismiss()}
            disabled={state !== "idle"}
            className="min-h-9 rounded-lg px-3 text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
            title="Produto pausado ou que não cumpre os requisitos do programa"
          >
            {state === "dismissing" ? "Descartando…" : "Descartar"}
          </button>
        </div>
        {check && (
          <div
            className={`mt-2 rounded-lg border p-2 text-xs ${
              check.status === "match"
                ? "border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/30"
                : check.status === "likely" || check.status === "unknown"
                  ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/30"
                  : "border-rose-600/50 bg-rose-50 dark:bg-rose-950/30"
            }`}
          >
            <p className="font-semibold">
              {check.status === "match"
                ? "✅ "
                : check.status === "likely" || check.status === "unknown"
                  ? "⚠️ "
                  : "⛔ "}
              {check.message}
            </p>
            {check.profileOk === false && (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                ⚠️ Não vi a sua tag de afiliado (precocaindo) neste link.
              </p>
            )}
          </div>
        )}
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

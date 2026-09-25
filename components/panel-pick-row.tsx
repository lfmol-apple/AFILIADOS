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
  /** Product page address from the panel card; enables the one-click Linkbuilder flow. */
  productUrl?: string;
}

interface LinkCheck {
  status: "match" | "likely" | "mismatch" | "unknown" | "duplicate" | "invalid";
  message: string;
  panelTitle: string;
  linkTitle: string | null;
  profileOk: boolean | null;
  duplicateOf: string | null;
}

/** One product of the link list: shows the numbers and takes the pasted link. */
// The official Linkbuilder: takes a product address and returns the affiliate link
// (the same tool the old admin queue opened).
const LINKBUILDER_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";

export function PanelPickRow(props: PanelPickRowProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "saving" | "done">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [check, setCheck] = useState<LinkCheck | null>(null);

  async function openTool() {
    const toCopy = props.productUrl ?? props.title;
    try {
      await navigator.clipboard.writeText(toCopy);
      setMessage(
        props.productUrl
          ? "Endereço copiado. Cole no Linkbuilder."
          : "Título copiado. No Linkbuilder, cole o endereço do produto (se não tiver, procure pelo título).",
      );
    } catch {
      setMessage(
        "Não consegui copiar automaticamente; copie o endereço do produto manualmente.",
      );
    }
    window.open(LINKBUILDER_URL, "_blank", "noopener");
  }

  /** Opens the pasted link on the server and compares it with this row's product. */
  async function runCheck(value: string): Promise<LinkCheck | null> {
    setState("checking");
    setMessage("");
    setCheck(null);
    try {
      const response = await fetch("/api/admin/ml-panel-links/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, affiliateUrl: value.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
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
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/ml-panel-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: props.id,
          affiliateUrl: value.trim(),
          force,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        title?: string | null;
        check?: LinkCheck;
      };
      if (!response.ok || !data.ok) {
        setState("idle");
        if (data.check) setCheck(data.check);
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

  /** Paste = check first; saves by itself only when the link is proven to be this product. */
  async function checkThenSave(value: string) {
    const result = await runCheck(value);
    if (result?.status === "match") await save(value);
  }

  function saveOverride() {
    if (!check) return;
    if (check.status === "mismatch") {
      const ok = window.confirm(
        "O link parece ser de OUTRO produto. Salvar mesmo assim?",
      );
      if (!ok) return;
      void save(url, true);
      return;
    }
    void save(url);
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
      {props.productUrl && (
        <a
          href={props.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand mt-0.5 inline-block text-xs underline underline-offset-2"
        >
          ver o produto no Mercado Livre (link genérico)
        </a>
      )}
      {props.notes.length > 0 && (
        <p className="text-foreground/60 mt-0.5 text-xs">
          {props.notes.join(" · ")}
        </p>
      )}
      <div className="mt-2">
        <button
          type="button"
          onClick={openTool}
          className="border-border-subtle hover:border-brand min-h-10 rounded-lg border px-3 text-sm font-medium"
        >
          {props.productUrl
            ? "1. Copiar endereço + abrir Linkbuilder →"
            : "1. Copiar título + abrir Linkbuilder →"}
        </button>
      </div>
      <p className="text-foreground/60 mt-2 text-xs">
        2. Cole aqui o link gerado (meli.la/… ou mercadolivre.com/sec/…): o
        sistema confere se é o mesmo produto e só salva sozinho quando confere.
      </p>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
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
          placeholder="Cole aqui o link gerado (meli.la/... ou mercadolivre.com/sec/...)"
          className="border-border-subtle bg-surface-muted min-h-10 w-full rounded-lg border px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void (check ? saveOverride() : checkThenSave(url))}
          disabled={
            state !== "idle" ||
            !url.trim() ||
            check?.status === "duplicate" ||
            check?.status === "invalid"
          }
          className="bg-brand text-brand-foreground min-h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
        >
          {state === "checking"
            ? "Conferindo…"
            : state === "saving"
              ? "Salvando…"
              : !check
                ? "Conferir e salvar"
                : check.status === "mismatch"
                  ? "Salvar mesmo assim"
                  : check.status === "match"
                    ? "Salvar"
                    : "Confirmo, salvar"}
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
          {check.status !== "duplicate" && check.status !== "invalid" && (
            <dl className="mt-1 space-y-0.5">
              <div>
                <dt className="text-foreground/60 inline">Esta linha: </dt>
                <dd className="inline">{check.panelTitle}</dd>
              </div>
              <div>
                <dt className="text-foreground/60 inline">O link abre: </dt>
                <dd className="inline">
                  {check.linkTitle ?? "(não consegui ler o título)"}
                </dd>
              </div>
            </dl>
          )}
          {check.profileOk === true && (
            <p className="mt-1 text-emerald-700 dark:text-emerald-400">
              ✅ É do seu perfil de afiliado (tag precocaindo).
            </p>
          )}
          {check.profileOk === false && (
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              ⚠️ Não vi a sua tag de afiliado (precocaindo) neste link. Confirme
              que ele foi gerado no seu Linkbuilder.
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
    </li>
  );
}

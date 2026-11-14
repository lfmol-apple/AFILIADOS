"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NewMlBatchRow, NewMlBatchStatus } from "@/lib/services/new-ml-products-batch";

const LINKBUILDER_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";
const MAX = 40;
const SAVE_CONCURRENCY = 3;

const LABEL: Record<NewMlBatchStatus, { icon: string; text: string; tone: string }> = {
  match: {
    icon: "✅",
    text: "Confere — pronto para salvar",
    tone: "text-emerald-700 dark:text-emerald-400",
  },
  likely: {
    icon: "⚠️",
    text: "Só o título bate — confirme",
    tone: "text-amber-700 dark:text-amber-400",
  },
  none: { icon: "⛔", text: "Não é de nenhum produto desta lista", tone: "text-rose-600" },
  repeated: {
    icon: "⛔",
    text: "Repetido: outro link do lote já é deste produto",
    tone: "text-rose-600",
  },
  duplicate: { icon: "⛔", text: "Este link já está salvo em um produto", tone: "text-rose-600" },
  notMine: { icon: "⛔", text: "Não vi a sua tag de afiliado neste link", tone: "text-rose-600" },
  unreadable: { icon: "⛔", text: "Não consegui abrir o link", tone: "text-rose-600" },
  invalid: { icon: "⛔", text: "Não é um link do Mercado Livre", tone: "text-rose-600" },
};

export function NewMlProductsBatch(props: {
  addresses: string[];
  pendingCount: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(Math.min(30, props.addresses.length));
  const [text, setText] = useState("");
  const [rows, setRows] = useState<NewMlBatchRow[] | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "checking" | "saving">("");
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");

  const n = Math.max(1, Math.min(MAX, count, props.addresses.length));

  async function copyAndOpen() {
    const list = props.addresses.slice(0, n).join("\n");
    try {
      await navigator.clipboard.writeText(list);
      setMessage(
        `${n} endereços copiados (um por linha). Cole no Linkbuilder, gere, copie TODOS os links gerados e cole na caixa abaixo.`,
      );
    } catch {
      setMessage("Não consegui copiar automaticamente.");
    }
    window.open(LINKBUILDER_URL, "_blank", "noopener");
  }

  async function check() {
    if (!text.trim() || busy) return;
    setBusy("checking");
    setMessage("");
    setSaved({});
    try {
      const response = await fetch("/api/admin/new-ml-products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        rows?: NewMlBatchRow[];
        error?: string;
      };
      if (!response.ok || !data.rows) {
        setRows(null);
        setMessage(data.error ?? "Não consegui conferir o lote.");
      } else {
        setRows(data.rows);
      }
    } catch {
      setMessage("Falha de rede ao conferir. Tente de novo.");
    }
    setBusy("");
  }

  async function saveOne(row: NewMlBatchRow): Promise<boolean> {
    if (!row.merchantListingId) return false;
    try {
      const response = await fetch("/api/admin/ml-affiliate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantListingId: row.merchantListingId,
          affiliateUrl: row.link,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setSaved((s) => ({
        ...s,
        [row.link]: response.ok ? "ok" : (data.error ?? "erro"),
      }));
      return response.ok;
    } catch {
      setSaved((s) => ({ ...s, [row.link]: "falha de rede" }));
      return false;
    }
  }

  async function saveRows(todo: NewMlBatchRow[]) {
    setBusy("saving");
    setSaved((s) => {
      const next = { ...s };
      for (const r of todo) if (next[r.link] !== "ok") delete next[r.link];
      return next;
    });
    const okLinks: string[] = [];
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const row = todo[next++]!;
        if (await saveOne(row)) okLinks.push(row.link);
        done += 1;
        setProgress(`Salvando ${done} de ${todo.length}…`);
      }
    };
    setProgress(`Salvando 0 de ${todo.length}…`);
    await Promise.all(
      Array.from({ length: Math.min(SAVE_CONCURRENCY, todo.length) }, worker),
    );
    setProgress("");
    setBusy("");
    finishBatch(okLinks, todo.length);
  }

  function finishBatch(okLinks: string[], attempted: number) {
    setText("");
    setRows((prev) => {
      const left = prev ? prev.filter((r) => !okLinks.includes(r.link)) : null;
      return left && left.length > 0 ? left : null;
    });
    const remaining = Math.max(0, props.pendingCount - okLinks.length);
    setMessage(
      `${okLinks.length} de ${attempted} salvos. Restam ${remaining} na lista — a tela já está pronta para os próximos.`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  async function saveMatches() {
    if (!rows || busy) return;
    await saveRows(
      rows.filter((r) => r.status === "match" && saved[r.link] !== "ok"),
    );
  }

  async function saveAllLikely() {
    if (!rows || busy) return;
    const todo = rows.filter(
      (r) => r.status === "likely" && saved[r.link] !== "ok",
    );
    if (todo.length === 0) return;
    if (
      !window.confirm(
        `Confirma que os ${todo.length} links "só o título bate" são mesmo dos produtos indicados?`,
      )
    )
      return;
    await saveRows(todo);
  }

  const likelyCount = rows
    ? rows.filter((r) => r.status === "likely" && saved[r.link] !== "ok").length
    : 0;
  const readyCount = rows
    ? rows.filter((r) => r.status === "match" && saved[r.link] !== "ok").length
    : 0;

  return (
    <div className="space-y-5">
      <section className="border-border-subtle rounded-xl border p-3">
        <h2 className="text-sm font-semibold">1. Gerar no Linkbuilder, em lote</h2>
        <p className="text-foreground/60 mt-1 text-xs">
          Copia os endereços dos próximos produtos, um por linha. Cole todos de
          uma vez no Linkbuilder (limite de 30 por vez) e gere.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            Quantos:
            <input
              type="number"
              min={1}
              max={MAX}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
              className="border-border-subtle bg-surface-muted min-h-10 w-20 rounded-lg border px-2"
            />
          </label>
          <button
            type="button"
            onClick={copyAndOpen}
            className="border-border-subtle hover:border-brand min-h-10 rounded-lg border px-3 font-medium"
          >
            Copiar {n} endereços + abrir Linkbuilder →
          </button>
          <span className="text-foreground/50 text-xs">
            {props.pendingCount} aguardando link
          </span>
        </div>
      </section>

      <section className="border-border-subtle rounded-xl border p-3">
        <h2 className="text-sm font-semibold">2. Cole aqui todos os links gerados</h2>
        <p className="text-foreground/60 mt-1 text-xs">
          Pode colar em qualquer ordem — o sistema abre cada link e descobre a
          que produto ele pertence.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRows(null);
          }}
          rows={6}
          placeholder={"https://meli.la/…\nhttps://meli.la/…"}
          className="border-border-subtle bg-surface-muted mt-2 w-full rounded-lg border p-2 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void check()}
            disabled={!!busy || !text.trim()}
            className="bg-brand text-brand-foreground min-h-10 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
          >
            {busy === "checking" ? "Conferindo os links…" : "Conferir o lote"}
          </button>
          <button
            type="button"
            onClick={() => void saveMatches()}
            disabled={!!busy || readyCount === 0}
            className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy === "saving"
              ? progress || "Salvando…"
              : `Salvar os ${readyCount} que conferem`}
          </button>
          {likelyCount > 0 && (
            <button
              type="button"
              onClick={() => void saveAllLikely()}
              disabled={!!busy}
              className="border-border-subtle hover:border-brand min-h-10 rounded-lg border px-4 text-sm font-medium disabled:opacity-50"
            >
              Confirmar e salvar os {likelyCount} “só o título bate”
            </button>
          )}
        </div>
      </section>

      {message && <p className="text-sm">{message}</p>}

      {rows && (
        <section className="border-border-subtle rounded-xl border p-3">
          <h2 className="text-sm font-semibold">3. Resultado da conferência</h2>
          <p className="text-foreground/60 mt-1 text-xs">
            {rows.filter((r) => r.status === "match").length} conferem ·{" "}
            {rows.filter((r) => r.status === "likely").length} para confirmar ·{" "}
            {rows.filter((r) => !["match", "likely"].includes(r.status)).length}{" "}
            com problema
          </p>
          <ul className="mt-2 space-y-2">
            {rows.map((row) => {
              const info = LABEL[row.status];
              const result = saved[row.link];
              return (
                <li
                  key={row.link}
                  className="border-border-subtle rounded-lg border p-2 text-xs"
                >
                  <p className={`font-semibold ${info.tone}`}>
                    {info.icon} {info.text}
                  </p>
                  <p className="text-foreground/60 mt-0.5 break-all">{row.link}</p>
                  <p className="mt-0.5">
                    <span className="text-foreground/60">O link abre: </span>
                    {row.linkTitle ?? "(não consegui ler)"}
                  </p>
                  {row.productTitle && (
                    <p className="mt-0.5">
                      <span className="text-foreground/60">Produto: </span>
                      {row.productTitle}
                    </p>
                  )}
                  {result && (
                    <p
                      className={`mt-1 font-semibold ${result === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}
                    >
                      {result === "ok" ? "Salvo" : `Não salvou: ${result}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

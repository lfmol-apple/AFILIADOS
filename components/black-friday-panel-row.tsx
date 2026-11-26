"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface BlackFridayCandidateProp {
  id: string;
  storedPath: string;
  originalFilename: string;
  sha256: string;
}

export interface BlackFridayPanelRowProps {
  id: string;
  slotNumber: number;
  name: string;
  brand: string | null;
  advertisedPrice: number | null;
  currentPrice: number | null;
  mlUrlOriginal: string | null;
  resolvedProductUrl: string | null;
  resolvedExternalId: string | null;
  affiliateUrl: string | null;
  status: "PENDING_LINK" | "LINK_PASTED" | "VALIDATED" | "DIVERGENT" | "REJECTED";
  reviewNote: string | null;
  candidates: BlackFridayCandidateProp[];
  selectedCreativeId: string | null;
  enabled: boolean;
  destinationCheckedAt: string | null;
}

const LINKBUILDER_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";

const STATUS_LABEL: Record<BlackFridayPanelRowProps["status"], string> = {
  PENDING_LINK: "Aguardando link",
  LINK_PASTED: "Link colado — não confirmado",
  VALIDATED: "Validado (entra no XML)",
  DIVERGENT: "Divergência — revisar",
  REJECTED: "Rejeitado",
};

function currency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

export function BlackFridayPanelRow(props: BlackFridayPanelRowProps) {
  const router = useRouter();
  const [mlUrlOriginal, setMlUrlOriginal] = useState(props.mlUrlOriginal ?? "");
  const [affiliateUrl, setAffiliateUrl] = useState(props.affiliateUrl ?? "");
  const [selectedCreativeId, setSelectedCreativeId] = useState(props.selectedCreativeId);
  const [status, setStatus] = useState(props.status);
  const [enabled, setEnabled] = useState(props.enabled);
  const [destinationCheckedAt, setDestinationCheckedAt] = useState(props.destinationCheckedAt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/black-friday-2026/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        product?: {
          status: BlackFridayPanelRowProps["status"];
          enabled: boolean;
          destinationCheckedAt: string | null;
        };
      };
      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Falha ao salvar.");
        return;
      }
      if (data.product) {
        setStatus(data.product.status);
        setEnabled(data.product.enabled);
        setDestinationCheckedAt(data.product.destinationCheckedAt);
      }
      setMessage("Salvo.");
      // Owner's directive, 2026-11-26 ("o resumo apresenta informações
      // incompatíveis com os status individuais dos produtos"): the
      // counters at the top of the page are rendered once, server-side,
      // at page load — without this, they go stale the moment any row
      // saves a change, even though this row's own displayed status is
      // already correct. Re-runs the server component so the counters
      // (and every other row, which already reflects its own last save)
      // match reality again.
      router.refresh();
    } catch {
      setMessage("Falha de rede ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function testDestination() {
    if (!affiliateUrl.trim()) {
      setMessage("Cole o link de afiliado antes de testar.");
      return;
    }
    setChecking(true);
    setMessage("Conferindo destino…");
    try {
      const response = await fetch(`/api/admin/black-friday-2026/${props.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateUrl: affiliateUrl.trim(),
          mlUrlOriginal: (props.resolvedProductUrl ?? mlUrlOriginal).trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        check?: { status: string; message: string; linkTitle: string | null };
      };
      if (!response.ok || !data.check) {
        setMessage(data.error ?? "Não consegui conferir o link.");
        return;
      }
      setMessage(
        `${data.check.message}${data.check.linkTitle ? ` (título lido: "${data.check.linkTitle}")` : ""}`,
      );
      await save({ markDestinationChecked: true });
    } finally {
      setChecking(false);
    }
  }

  function copy(value: string) {
    navigator.clipboard?.writeText(value).catch(() => {});
    setMessage("Copiado.");
  }

  const priceDiverges =
    props.currentPrice !== null &&
    props.advertisedPrice !== null &&
    props.advertisedPrice > 0 &&
    Math.abs(props.currentPrice - props.advertisedPrice) / props.advertisedPrice > 0.05;

  const xmlEligible =
    enabled && status === "VALIDATED" && !!affiliateUrl && !!mlUrlOriginal && !!selectedCreativeId;
  const isPending = status === "PENDING_LINK" || status === "LINK_PASTED";
  const openOriginalHref = props.resolvedProductUrl ?? mlUrlOriginal;
  const selectedCandidate = props.candidates.find((c) => c.id === selectedCreativeId);

  return (
    <div
      id={`bf-row-${props.slotNumber}`}
      data-pending={isPending ? "true" : "false"}
      className={`border-border-subtle rounded-xl border p-4 ${enabled ? "" : "opacity-50"}`}
    >
      <div className="flex gap-4">
        <a
          href={selectedCandidate?.storedPath ?? props.candidates[0]?.storedPath}
          target="_blank"
          rel="noopener"
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border"
        >
          {selectedCandidate ? (
            <Image src={selectedCandidate.storedPath} alt={props.name} fill sizes="96px" className="object-cover" />
          ) : (
            <div className="bg-foreground/5 flex h-full w-full items-center justify-center text-center text-[10px]">
              {props.candidates.length === 0 ? "sem criativo" : "escolher criativo"}
            </div>
          )}
        </a>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground/50">
            #{String(props.slotNumber).padStart(2, "0")}
            {props.resolvedExternalId ? ` · ${props.resolvedExternalId}` : ""}
          </p>
          <h3 className="truncate text-sm font-semibold">
            {props.name}
            {props.brand ? <span className="text-foreground/50"> — {props.brand}</span> : null}
          </h3>
          <p className="text-sm">
            Anunciado: {currency(props.advertisedPrice)}
            {props.currentPrice !== null && (
              <span className={priceDiverges ? "ml-2 text-red-600" : "ml-2 text-foreground/50"}>
                · Atual: {currency(props.currentPrice)}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs font-medium">
            {STATUS_LABEL[status]} {!enabled && "· DESATIVADO"}
          </p>
          <p className="text-foreground/50 text-xs">
            Elegível para XML: {xmlEligible ? "sim" : "não"} · última verificação: {formatDateTime(destinationCheckedAt)}
          </p>
          {selectedCandidate && (
            <p className="text-foreground/40 truncate text-[10px]">
              {selectedCandidate.originalFilename} · sha256 {selectedCandidate.sha256.slice(0, 12)}…
            </p>
          )}
          {props.reviewNote && (
            <p className="mt-1 text-xs text-amber-700">⚠ {props.reviewNote}</p>
          )}
        </div>
      </div>

      {props.candidates.length === 0 && (
        <p className="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          Nenhum criativo correspondente — este produto fica fora do XML até o Henrique enviar um criativo.
        </p>
      )}

      {props.candidates.length >= 1 && (
        <div className="mt-3">
          <p className="text-xs font-medium">
            {props.candidates.length > 1 ? "Escolha o criativo correto:" : "Confirme o criativo:"}
          </p>
          <div className="mt-1 flex gap-2">
            {props.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCreativeId(c.id);
                  void save({ selectedCreativeId: c.id });
                }}
                title={c.originalFilename}
                className={`relative h-16 w-16 overflow-hidden rounded border-2 ${
                  selectedCreativeId === c.id ? "border-brand" : "border-transparent opacity-60"
                }`}
              >
                <Image src={c.storedPath} alt={c.originalFilename} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Link original (Mercado Livre)</label>
          <div className="mt-1 flex gap-1">
            <input
              value={mlUrlOriginal}
              onChange={(e) => setMlUrlOriginal(e.target.value)}
              onBlur={() => save({ mlUrlOriginal: mlUrlOriginal.trim() || null })}
              placeholder="https://www.mercadolivre.com.br/p/MLB..."
              className="border-border-subtle w-full rounded border px-2 py-1 text-xs"
            />
            {openOriginalHref && (
              <a
                href={openOriginalHref}
                target="_blank"
                rel="noopener"
                className="border-border-subtle shrink-0 rounded border px-2 py-1 text-xs"
              >
                abrir
              </a>
            )}
            {mlUrlOriginal && (
              <button
                type="button"
                onClick={() => copy(openOriginalHref ?? mlUrlOriginal)}
                className="border-border-subtle shrink-0 rounded border px-2 py-1 text-xs"
              >
                copiar
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">Link de afiliado (colar aqui)</label>
          <div className="mt-1 flex gap-1">
            <input
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              onBlur={() =>
                save({
                  affiliateUrl: affiliateUrl.trim() || null,
                  status: affiliateUrl.trim() ? "LINK_PASTED" : undefined,
                })
              }
              placeholder="https://mercadolivre.com/sec/..."
              className="border-border-subtle w-full rounded border px-2 py-1 text-xs"
            />
            {affiliateUrl && (
              <button
                type="button"
                onClick={() => copy(affiliateUrl)}
                className="border-border-subtle shrink-0 rounded border px-2 py-1 text-xs"
              >
                copiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={LINKBUILDER_URL} target="_blank" rel="noopener" className="border-border-subtle rounded border px-2 py-1 text-xs">
          Abrir Linkbuilder →
        </a>
        <button
          type="button"
          onClick={testDestination}
          disabled={checking}
          className="border-border-subtle rounded border px-2 py-1 text-xs disabled:opacity-50"
        >
          {checking ? "Testando…" : "Testar destino"}
        </button>
        <button
          type="button"
          onClick={() => void save({ status: "VALIDATED" })}
          disabled={!affiliateUrl || !mlUrlOriginal || !selectedCreativeId || saving}
          className="bg-brand text-brand-foreground rounded px-2 py-1 text-xs font-semibold disabled:opacity-40"
        >
          Marcar como validado
        </button>
        <button
          type="button"
          onClick={() => void save({ status: "DIVERGENT" })}
          className="rounded border border-amber-600 px-2 py-1 text-xs text-amber-700"
        >
          Sinalizar divergência
        </button>
        <button
          type="button"
          onClick={() => void save({ enabled: !enabled })}
          className="border-border-subtle rounded border px-2 py-1 text-xs"
        >
          {enabled ? "Desativar produto" : "Reativar produto"}
        </button>
        {message && <span className="text-foreground/60 text-xs">{message}</span>}
      </div>
    </div>
  );
}

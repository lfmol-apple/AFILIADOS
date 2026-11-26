"use client";

import { useState } from "react";
import Image from "next/image";

export interface BlackFridayPanelRowProps {
  id: string;
  slotNumber: number;
  name: string;
  brand: string | null;
  advertisedPrice: number;
  currentPrice: number | null;
  mlUrlOriginal: string | null;
  affiliateUrl: string | null;
  status: "PENDING_LINK" | "LINK_PASTED" | "VALIDATED" | "DIVERGENT" | "REJECTED";
  reviewNote: string | null;
  candidates: { id: string; storedPath: string; originalFilename: string }[];
  selectedCreativeId: string | null;
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

export function BlackFridayPanelRow(props: BlackFridayPanelRowProps) {
  const [mlUrlOriginal, setMlUrlOriginal] = useState(props.mlUrlOriginal ?? "");
  const [affiliateUrl, setAffiliateUrl] = useState(props.affiliateUrl ?? "");
  const [selectedCreativeId, setSelectedCreativeId] = useState(
    props.selectedCreativeId ?? (props.candidates.length === 1 ? props.candidates[0]!.id : ""),
  );
  const [status, setStatus] = useState(props.status);
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
        product?: { status: BlackFridayPanelRowProps["status"] };
      };
      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Falha ao salvar.");
        return;
      }
      if (data.product) setStatus(data.product.status);
      setMessage("Salvo.");
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
          mlUrlOriginal: mlUrlOriginal.trim() || null,
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

  const priceDiverges =
    props.currentPrice !== null &&
    Math.abs(props.currentPrice - props.advertisedPrice) / props.advertisedPrice > 0.05;

  return (
    <div className="border-border-subtle rounded-xl border p-4">
      <div className="flex gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border">
          {selectedCreativeId ? (
            <Image
              src={
                props.candidates.find((c) => c.id === selectedCreativeId)?.storedPath ??
                props.candidates[0]!.storedPath
              }
              alt={props.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="bg-foreground/5 flex h-full w-full items-center justify-center text-xs">
              escolher criativo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground/50">#{props.slotNumber}</p>
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
          <p className="mt-1 text-xs font-medium">{STATUS_LABEL[status]}</p>
          {props.reviewNote && (
            <p className="mt-1 text-xs text-amber-700">⚠ {props.reviewNote}</p>
          )}
        </div>
      </div>

      {props.candidates.length > 1 && (
        <div className="mt-3">
          <p className="text-xs font-medium">Escolha o criativo correto:</p>
          <div className="mt-1 flex gap-2">
            {props.candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCreativeId(c.id);
                  void save({ selectedCreativeId: c.id });
                }}
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
            {mlUrlOriginal && (
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(mlUrlOriginal).catch(() => {})}
                className="border-border-subtle shrink-0 rounded border px-2 text-xs"
              >
                copiar
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">Link de afiliado (colar aqui)</label>
          <input
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            onBlur={() => save({ affiliateUrl: affiliateUrl.trim() || null, status: affiliateUrl.trim() ? "LINK_PASTED" : undefined })}
            placeholder="https://mercadolivre.com/sec/..."
            className="border-border-subtle w-full rounded border px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={LINKBUILDER_URL}
          target="_blank"
          rel="noopener"
          className="border-border-subtle rounded border px-2 py-1 text-xs"
        >
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
        {message && <span className="text-foreground/60 text-xs">{message}</span>}
      </div>
    </div>
  );
}

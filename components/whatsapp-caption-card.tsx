"use client";

import { useState } from "react";

interface WhatsAppCaptionCardProps {
  position: number;
  title: string;
  imageUrl: string | null;
  caption: string;
}

export function WhatsAppCaptionCard({
  position,
  title,
  imageUrl,
  caption,
}: WhatsAppCaptionCardProps) {
  const [message, setMessage] = useState("");

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setMessage("Texto copiado. Cole na legenda da imagem no Canal.");
    } catch {
      setMessage("Não consegui copiar automaticamente — selecione o texto abaixo e copie.");
    }
  }

  return (
    <li className="border-border-subtle rounded-xl border p-4">
      <p className="text-foreground/60 text-xs font-semibold">#{position}</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external merchant image, not a local asset */}
            <img
              src={imageUrl}
              alt={title}
              className="h-32 w-32 rounded-lg object-cover"
            />
          </a>
        ) : (
          <div className="bg-background-muted text-foreground/50 flex h-32 w-32 shrink-0 items-center justify-center rounded-lg text-xs">
            sem imagem
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <pre className="text-foreground/70 mt-2 whitespace-pre-wrap text-sm">{caption}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCaption}
              className="bg-brand text-brand-foreground rounded-full px-4 py-2 text-xs font-semibold"
            >
              Copiar texto
            </button>
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border-subtle hover:border-brand rounded-full border px-4 py-2 text-xs font-semibold"
              >
                Abrir imagem (pra salvar)
              </a>
            )}
          </div>
          {message && <p className="text-foreground/60 mt-2 text-xs">{message}</p>}
        </div>
      </div>
    </li>
  );
}

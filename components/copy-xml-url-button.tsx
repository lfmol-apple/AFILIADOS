"use client";

import { useState } from "react";

export function CopyXmlUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="border-border-subtle rounded border px-2 py-1 text-xs"
    >
      {copied ? "Copiado!" : "Copiar URL do XML"}
    </button>
  );
}

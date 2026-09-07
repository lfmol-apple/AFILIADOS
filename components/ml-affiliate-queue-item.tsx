"use client";

// Deliberately imports nothing beyond next/navigation + react. This is a
// client component — anything it imports gets bundled for the browser.
// See lib/services/monetization-score.ts's sibling incident (2026-09-03):
// a client component that pulled in AffiliateDisclosure's env-reading
// import chain crashed hydration in production. Never repeat that here.
import { useRouter } from "next/navigation";
import { useState } from "react";

const ML_LINK_GENERATOR_URL = "https://afiliados.mercadolivre.com.br";

export interface MlAffiliateQueueItemProps {
  merchantListingId: string;
  title: string;
  publicUrl: string;
  brand: string | null;
  monetizationScore: number | null;
  monetizationConfidence: number;
  monetizationReasons: string[];
  latestSignal: {
    soldQuantity: number | null;
    trendRank: number | null;
    bestsellerRank: number | null;
    commissionRate: number | null;
    estimatedCommissionAmount: string | null;
  } | null;
  bestOffer: {
    price: number;
    originalPrice: number | null;
    discountPercent: number | null;
    condition: string | null;
    freeShipping: boolean | null;
    sellerNickname: string | null;
    sellerReputationLevel: string | null;
    sellerPowerSellerStatus: string | null;
    /** ALWAYS false today — no Mercado Livre endpoint this app can reach
     * confirms a real permalink for a third-party item (see
     * scripts/ml-enrich-offers.ts's doc comment for the full
     * investigation, 2026-09-07). Drives the caveat below — publicUrl must
     * never be presented as a confirmed clickable link while this is
     * false. */
    permalinkVerified: boolean;
  } | null;
}

export function MlAffiliateQueueItem(props: MlAffiliateQueueItemProps) {
  const router = useRouter();
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the URL
      // is still visible in the field below, so this is a soft failure.
    }
  }

  // The item's own title + seller nickname — the recommended search terms
  // for the official affiliate portal (proven, working flow), used because
  // publicUrl is not a confirmed clickable link (permalinkVerified: false
  // today — see MlAffiliateQueueItemProps.bestOffer's doc comment).
  const searchTerms = [props.title, props.bestOffer?.sellerNickname].filter(Boolean).join(" — ");

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ml-affiliate-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantListingId: props.merchantListingId,
          affiliateUrl,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Falha ao salvar.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (saved) return null;

  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{props.title}</p>
          {props.brand && (
            <p className="text-foreground/50 text-xs">{props.brand}</p>
          )}
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold">
            MonetizationScore:{" "}
            {props.monetizationScore ?? "—"}{" "}
            <span className="text-foreground/50 font-normal">
              (confiança {(props.monetizationConfidence * 100).toFixed(0)}%)
            </span>
          </p>
        </div>
      </div>

      {props.bestOffer ? (
        <dl className="text-foreground/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div>
            Preço:{" "}
            {props.bestOffer.price.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            {props.bestOffer.discountPercent !== null &&
              ` (−${Math.round(props.bestOffer.discountPercent * 100)}%)`}
          </div>
          <div>Condição: {props.bestOffer.condition ?? "—"}</div>
          <div>Frete grátis: {props.bestOffer.freeShipping ? "sim" : "não"}</div>
          <div>
            Vendedor: {props.bestOffer.sellerNickname ?? "—"}
            {props.bestOffer.sellerReputationLevel &&
              ` (reputação: ${props.bestOffer.sellerReputationLevel})`}
          </div>
        </dl>
      ) : null}

      {props.bestOffer && !props.bestOffer.permalinkVerified && (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          ⚠️ A API do Mercado Livre não confirma um link público para esta
          oferta específica (investigado — ver docs/MONETIZATION_SCORE.md).
          Use os termos de busca abaixo no portal oficial, não confie no
          endereço copiado como um link direto.
        </p>
      )}

      {!props.bestOffer && (
        <p className="text-foreground/50 mt-2 text-xs">
          Ainda sem oferta de vendedor enriquecida — mostrando apenas o sinal
          de demanda. Rode scripts/ml-enrich-offers.ts para investigar ofertas
          reais.
        </p>
      )}

      {props.monetizationReasons.length > 0 && (
        <ul className="text-foreground/60 mt-2 list-disc pl-4 text-xs">
          {props.monetizationReasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      {props.latestSignal && (
        <dl className="text-foreground/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {props.latestSignal.soldQuantity !== null && (
            <div>Vendidos: {props.latestSignal.soldQuantity}</div>
          )}
          {props.latestSignal.trendRank !== null && (
            <div>Trend rank: {props.latestSignal.trendRank}</div>
          )}
          {props.latestSignal.bestsellerRank !== null && (
            <div>Bestseller rank: {props.latestSignal.bestsellerRank}</div>
          )}
          {props.latestSignal.commissionRate !== null && (
            <div>
              Comissão: {(props.latestSignal.commissionRate * 100).toFixed(1)}%
            </div>
          )}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {props.bestOffer && !props.bestOffer.permalinkVerified ? (
          <button
            type="button"
            onClick={() => handleCopy(searchTerms)}
            className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
          >
            {copied ? "Copiado!" : "Copiar termo de busca"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleCopy(props.publicUrl)}
            className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
          >
            {copied ? "Copiado!" : "Copiar URL pública"}
          </button>
        )}
        <a
          href={ML_LINK_GENERATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          Abrir gerador de links ML →
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={affiliateUrl}
          onChange={(e) => setAffiliateUrl(e.target.value)}
          placeholder="Cole aqui o link gerado (mercadolivre.com/sec/... ou .../social/...)"
          className="border-border-subtle min-h-9 min-w-64 flex-1 rounded-md border px-3 text-xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || affiliateUrl.trim().length === 0}
          className="bg-brand text-brand-foreground min-h-9 rounded-full px-4 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar e ir para o próximo"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

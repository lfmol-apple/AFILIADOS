"use client";

import { useEffect, useState } from "react";
import { readCachedConsent, submitConsent, type CachedConsent } from "@/lib/privacy/consent-client";

/**
 * LGPD consent banner. All three choices (Aceitar / Recusar / Configurar)
 * are equally sized and equally reachable — no dark pattern where "Aceitar"
 * is a button and "Recusar" is a small link (project brief Part M).
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Reading a browser-only cookie: this must happen post-mount to stay
    // hydration-safe (server has no cookie access), so this is exactly the
    // "synchronize with an external system" case effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readCachedConsent() === null);
  }, []);

  if (!visible) return null;

  async function choose(consent: CachedConsent) {
    await submitConsent(consent);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-background p-4 shadow-lg">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-foreground/80">
          Usamos cookies essenciais para o site funcionar. Com sua permissão, também usamos
          cookies de análise para entender o que é útil no PreçoCaindo. Veja detalhes na{" "}
          <a href="/privacidade" className="text-brand underline">
            Política de privacidade
          </a>
          .
        </p>

        {configuring && (
          <div className="mt-3 space-y-2 rounded-lg border border-border-subtle p-3 text-sm">
            <label className="flex items-center justify-between gap-4">
              <span>Analytics (entender uso do site)</span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Marketing (ainda não utilizado no PreçoCaindo)</span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose({ analytics: "GRANTED", marketing: "GRANTED" })}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground"
          >
            Aceitar
          </button>
          <button
            type="button"
            onClick={() => choose({ analytics: "DENIED", marketing: "DENIED" })}
            className="rounded-full border border-border-subtle px-5 py-2 text-sm font-semibold"
          >
            Recusar não essenciais
          </button>
          {configuring ? (
            <button
              type="button"
              onClick={() =>
                choose({
                  analytics: analytics ? "GRANTED" : "DENIED",
                  marketing: marketing ? "GRANTED" : "DENIED",
                })
              }
              className="rounded-full border border-border-subtle px-5 py-2 text-sm font-semibold"
            >
              Salvar preferências
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfiguring(true)}
              className="rounded-full border border-border-subtle px-5 py-2 text-sm font-semibold"
            >
              Configurar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

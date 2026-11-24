"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await fetch("/api/admin/push-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}

/**
 * Turns the owner's "site was accessed" push notifications on/off for THIS
 * browser. On iOS, Web Push only works from a home-screen-installed app
 * (Settings > Notifications don't apply to a plain Safari tab) — isIOS +
 * isStandalone below detect that and show the install step instead of a
 * button that would silently fail.
 */
export function PushNotificationsManager() {
  const [supported, setSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reading navigator/window: browser-only, must happen post-mount to stay
    // hydration-safe (the server has neither) — the same case effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => registration.pushManager.getSubscription())
        .then(setSubscription)
        .catch(() => {});
    }
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setError(
          "O servidor não está configurado para push (chave pública ausente). Avise quem administra o site.",
        );
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      await postSubscription(sub);
      setSubscription(sub);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        setError(
          isIOS
            ? "Notificação negada. Nos Ajustes do iPhone, procure o ícone do PreçoCaindo na tela de início e permita notificações — ou remova o ícone e adicione de novo."
            : "Você bloqueou as notificações para este site. Permita nas configurações do navegador e tente de novo.",
        );
      } else {
        setError(
          `Não consegui ativar${err instanceof Error ? `: ${err.message}` : ""}.`,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setBusy(true);
    setError(null);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await fetch("/api/admin/push-subscription", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setSubscription(null);
    } catch {
      setError("Não consegui desativar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (isIOS && !isStandalone) {
    return (
      <div className="border-border-subtle rounded-lg border p-4">
        <p className="text-sm font-medium">
          Passo 1 no iPhone: adicionar à Tela de Início
        </p>
        <p className="text-foreground/60 mt-1 text-xs">
          No Safari, toque no ícone de compartilhar (o quadrado com a seta para
          cima) e depois em &quot;Adicionar à Tela de Início&quot;. O iPhone só
          entrega notificações de um site que vira um ícone assim — numa aba
          comum do Safari não tem como. Depois de adicionar, abra o PreçoCaindo
          pelo ícone novo (não pelo Safari) e volte nesta página.
        </p>
      </div>
    );
  }

  if (!supported) {
    return (
      <p className="text-foreground/60 text-sm">
        Este navegador não aceita notificações push.
      </p>
    );
  }

  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {subscription
              ? "Ativado neste navegador"
              : "Desativado neste navegador"}
          </p>
          <p className="text-foreground/60 mt-1 text-xs">
            {subscription
              ? "Você recebe um aviso quando o site é acessado."
              : isIOS
                ? "Toque em ativar e, quando o iPhone perguntar, escolha permitir notificações."
                : "Ative e permita notificações quando o navegador perguntar."}
          </p>
        </div>
        <button
          type="button"
          onClick={subscription ? unsubscribe : subscribe}
          disabled={busy}
          className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${
            subscription
              ? "border-border-subtle hover:border-brand border"
              : "bg-brand text-brand-foreground"
          }`}
        >
          {busy ? "Salvando…" : subscription ? "Desativar" : "Ativar avisos"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

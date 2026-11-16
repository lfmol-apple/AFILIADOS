"use client";

import { getOrCreateSubjectId, readCachedConsent } from "@/lib/privacy/consent-client";

/**
 * Fires its own event, separate from the page's own AnalyticsBeacon
 * pageview — owner's brief (2026-11-17): "não confundir clique no botão
 * com novo seguidor". A pageview only proves someone saw the invite; this
 * proves someone actually tried to act on it. WhatsApp itself never tells
 * us whether the click turned into a real follower (no API for that), so
 * this click count is the honest ceiling on that number, never the number
 * itself.
 */
export function CanalJoinButton({ channelUrl }: { channelUrl: string }) {
  function handleClick() {
    const consent = readCachedConsent();
    if (consent?.analytics === "GRANTED") {
      const sessionId = getOrCreateSubjectId();
      const params = new URLSearchParams(window.location.search);
      fetch("/api/analytics/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType: "canal_convite_clique",
          pageSlug: "canal",
          utmSource: params.get("utm_source") ?? undefined,
          utmMedium: params.get("utm_medium") ?? undefined,
          utmCampaign: params.get("utm_campaign") ?? undefined,
          sessionId,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  if (!channelUrl) {
    return (
      <p className="text-foreground/60 text-sm" role="status">
        Link do Canal temporariamente indisponível.
      </p>
    );
  }

  return (
    <a
      href={channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="bg-brand text-brand-foreground inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-base font-semibold hover:opacity-90 sm:w-auto"
    >
      Entrar no Canal →
    </a>
  );
}

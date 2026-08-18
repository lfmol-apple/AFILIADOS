"use client";

import { useEffect } from "react";
import { getOrCreateSubjectId, readCachedConsent } from "@/lib/privacy/consent-client";

/**
 * Fires a first-party pageview beacon, but only when the visitor has
 * granted ANALYTICS consent (project brief Part M: "Analytics: respeitar
 * configuração/consentimento aplicável"). Renders nothing.
 */
export function AnalyticsBeacon({
  pageType,
  pageSlug,
  productId,
}: {
  pageType: string;
  pageSlug: string;
  productId?: string;
}) {
  useEffect(() => {
    const consent = readCachedConsent();
    if (consent?.analytics !== "GRANTED") return;

    const sessionId = getOrCreateSubjectId();
    const params = new URLSearchParams(window.location.search);

    fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageType,
        pageSlug,
        productId,
        referrer: document.referrer || undefined,
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        sessionId,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pageType, pageSlug, productId]);

  return null;
}

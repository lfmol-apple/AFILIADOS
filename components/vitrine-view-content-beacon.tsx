"use client";

import { useEffect } from "react";
import { trackViewContent, type VitrineProductIdentity } from "@/lib/analytics/meta-pixel-client";

/**
 * Fires Meta Pixel's ViewContent exactly once per real mount of a
 * Vitrine-tracked product page — same dedup pattern as
 * components/analytics-beacon.tsx (effect dependency array, not a
 * global listener), so a client-side re-render of the same page never
 * re-fires it. Renders nothing. Owner's authorization, 2026-11-22
 * ("Frente B — Pixel Meta do Henrique").
 */
export function VitrineViewContentBeacon(product: VitrineProductIdentity) {
  useEffect(() => {
    trackViewContent(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per real identity, not on every object re-creation
  }, [product.merchantListingId, product.title, product.price]);

  return null;
}

/**
 * Owner's request, 2026-11-27: seasonal Black Friday styling, today only
 * (until 00:00) — a single source of truth so the /ofertas header and
 * the per-card tag (components/unified-offer-card.tsx) never drift out
 * of sync with each other. Gated on the literal date, never a flag
 * someone has to remember to flip off tomorrow.
 */
export function isBlackFridayToday(): boolean {
  return new Date().toISOString().slice(0, 10) === "2026-11-27";
}

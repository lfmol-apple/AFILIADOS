"use client";

/**
 * Owner's authorization, 2026-11-22 ("Frente B — Pixel Meta do
 * Henrique", B8: "permitir alterar posteriormente a preferência").
 * Real root cause fixed: components/consent-banner.tsx only ever showed
 * itself once, on the first visit with no stored choice — there was no
 * way to come back and change a decision afterward. This dispatches the
 * same reopen event consent-banner.tsx now listens for; it does not
 * itself touch the stored consent, only the banner's own visibility.
 */
export const COOKIE_PREFERENCES_REOPEN_EVENT = "pc:cookie-preferences-reopen";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_REOPEN_EVENT))}
      className="hover:text-brand text-left"
    >
      Preferências de cookies
    </button>
  );
}

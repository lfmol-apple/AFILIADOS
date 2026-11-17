import Link from "next/link";

/**
 * Invite to the "Mercado Livre, Shopee e Amazon" WhatsApp Channel — owner's
 * brief, 2026-11-17: visible near the home's top and on product pages,
 * without hurting the offers' visibility, and WITHOUT depending on
 * WhatsApp Business (the owner's channel is on the common WhatsApp app).
 *
 * Deliberately links to /canal (the dedicated invite page, which already
 * tracks its own pageview and join-button click — see app/canal/page.tsx
 * and components/canal-join-button.tsx) rather than embedding the real
 * WhatsApp link here directly — one place owns that tracking, never two.
 */
export function CanalInviteBlock({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/canal"
        className="border-border-subtle hover:border-brand bg-surface-muted flex items-center gap-3 rounded-xl border p-4 transition"
      >
        <span aria-hidden className="text-2xl">
          📬
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Mercado Livre, Shopee e Amazon no WhatsApp
          </span>
          <span className="text-foreground/60 block text-xs">
            Ofertas selecionadas direto no seu Canal, de graça.
          </span>
        </span>
        <span className="text-brand shrink-0 text-sm font-semibold">
          Entrar →
        </span>
      </Link>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        href="/canal"
        className="border-border-subtle hover:border-brand bg-surface-muted flex flex-col items-start gap-4 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <p className="text-base font-semibold">
            📬 Canal Mercado Livre, Shopee e Amazon no WhatsApp
          </p>
          <p className="text-foreground/70 mt-1 text-sm leading-relaxed">
            Promoções comprovadas e cupons direto no seu WhatsApp comum —
            gratuito, sem spam.
          </p>
        </div>
        <span className="bg-brand text-brand-foreground inline-flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-semibold">
          Entrar no Canal →
        </span>
      </Link>
    </section>
  );
}

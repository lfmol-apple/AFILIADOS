/** Generic, merchant-neutral affiliate disclosure — NOT AffiliateDisclosure
 * (components/affiliate-disclosure.tsx), whose text is the Amazon
 * Associates Program's specific mandated wording ("Como associado da
 * Amazon..."). Reusing that here would be a false claim on a Mercado
 * Livre/Shopee page. */
function GenericAffiliateDisclosure() {
  return (
    <p className="text-foreground/60 text-xs">
      <span className="text-foreground/70 font-medium">
        Publicidade / link de afiliado.
      </span>{" "}
      O PreçoCaindo pode receber uma comissão por compras feitas através deste
      link. Isso não altera o preço que você paga.
    </p>
  );
}

/**
 * Mercado Livre/Shopee equivalent of AmazonCta — but the fail-closed
 * decision (AffiliateLinkRegistry.status === "ACTIVE") already happened in
 * lib/queries/public-product.ts's buildCtaHref(); this component just
 * renders whatever it was handed. `ctaHref === null` always means "no
 * commercial CTA", never a bug to work around here.
 *
 * Plain <a>, never next/link's <Link> (found live, 2026-10-01): ctaHref is
 * a /go/ redirect leaving the site, not an app page — Link prefetches its
 * href automatically, and Meta's crawler rendering this page was enough to
 * fire that prefetch and get recorded as a real click (226 in two hours,
 * zero real pageviews alongside them). See app/go/*'s isPrefetchRequest
 * guard for the second layer of defense against the same mistake.
 */
export function MerchantCta({
  ctaHref,
  label = "Ver oferta →",
  className = "",
  showDisclosure = true,
}: {
  ctaHref: string | null;
  label?: string;
  className?: string;
  showDisclosure?: boolean;
}) {
  if (!ctaHref) {
    return (
      <p className={`text-foreground/60 text-sm ${className}`} role="status">
        Ainda não temos um link de oferta ativo para este produto.
      </p>
    );
  }

  const classNameValue =
    "bg-brand text-brand-foreground inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90";

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <a href={ctaHref} className={classNameValue}>
        {label}
      </a>
      {showDisclosure && <GenericAffiliateDisclosure />}
    </div>
  );
}

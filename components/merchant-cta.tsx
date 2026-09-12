import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

/**
 * Mercado Livre/Shopee equivalent of AmazonCta — but the fail-closed
 * decision (AffiliateLinkRegistry.status === "ACTIVE") already happened in
 * lib/queries/public-product.ts's buildCtaHref(); this component just
 * renders whatever it was handed. `ctaHref === null` always means "no
 * commercial CTA", never a bug to work around here.
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
      <Link href={ctaHref} className={classNameValue}>
        {label}
      </Link>
      {showDisclosure && <AffiliateDisclosure />}
    </div>
  );
}

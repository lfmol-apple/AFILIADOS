import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { isValidAsin } from "@/lib/amazon/policy-guard";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

/**
 * The only sanctioned way to send a visitor toward Amazon: a real,
 * user-initiated tracked redirect. If the current PreçoCaindo application
 * does not have a confirmed Associate tag for the marketplace, do not show a
 * direct Amazon URL and do not imply affiliate commission.
 */
export function AmazonCta({
  asin,
  marketplace = "BR",
  pageType,
  pageSlug,
  label = "Ver oferta na Amazon →",
  className = "",
  showDisclosure = true,
}: {
  asin: string;
  marketplace?: MarketplaceCode;
  pageType: string;
  pageSlug: string;
  label?: string;
  className?: string;
  showDisclosure?: boolean;
}) {
  const config = getAmazonMarketplaceConfig(marketplace);
  const canUseAffiliateRedirect = Boolean(
    config.enabled && config.associateTag && isValidAsin(asin),
  );
  if (!canUseAffiliateRedirect) {
    return (
      <p className={`text-foreground/60 text-sm ${className}`} role="status">
        Oferta Amazon temporariamente indisponível.
      </p>
    );
  }

  const path =
    marketplace === "BR"
      ? `/go/amazon/${asin}`
      : `/go/amazon/${marketplace}/${asin}`;
  const href = `${path}?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`;

  const classNameValue =
    "bg-brand text-brand-foreground inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90";

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <Link href={href} className={classNameValue}>
        {label}
      </Link>
      {showDisclosure && <AffiliateDisclosure />}
    </div>
  );
}

import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import {
  buildAmazonDirectProductUrl,
  isValidAsin,
} from "@/lib/amazon/policy-guard";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

/**
 * The only sanctioned way to send a visitor toward Amazon: a real,
 * user-initiated link. Once a marketplace has an operational Associate tag,
 * use /go/amazon/... for tracked Special Links; before that, US can fall
 * back to a plain amazon.com product URL that earns no commission.
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
    config.enabled && config.associateTag,
  );
  const path =
    marketplace === "BR"
      ? `/go/amazon/${asin}`
      : `/go/amazon/${marketplace}/${asin}`;
  const href = canUseAffiliateRedirect
    ? `${path}?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`
    : isValidAsin(asin)
      ? buildAmazonDirectProductUrl(asin, marketplace)
      : "#";
  const isExternal = href.startsWith("https://");
  const ctaLabel =
    label === "Ver oferta na Amazon →" && !canUseAffiliateRedirect
      ? "Ver na Amazon →"
      : label;

  const classNameValue =
    "bg-brand text-brand-foreground inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90";

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      {isExternal ? (
        <a href={href} className={classNameValue} rel="nofollow sponsored">
          {ctaLabel}
        </a>
      ) : (
        <Link href={href} className={classNameValue}>
          {ctaLabel}
        </Link>
      )}
      {canUseAffiliateRedirect && showDisclosure && <AffiliateDisclosure />}
    </div>
  );
}

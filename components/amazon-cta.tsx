import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";

/**
 * The only sanctioned way to send a visitor toward Amazon: a real,
 * user-initiated link to /go/amazon/[asin] (never an automatic redirect —
 * project brief section 44). Label always names the real destination
 * (section 45) since PreçoCaindo does not sell anything itself.
 */
export function AmazonCta({
  asin,
  pageType,
  pageSlug,
  label = "Ver oferta na Amazon →",
  className = "",
}: {
  asin: string;
  pageType: string;
  pageSlug: string;
  label?: string;
  className?: string;
}) {
  const href = `/go/amazon/${asin}?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`;

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <Link
        href={href}
        className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-90"
      >
        {label}
      </Link>
      <AffiliateDisclosure />
    </div>
  );
}

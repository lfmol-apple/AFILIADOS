import { siteConfig } from "@/lib/config/site";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * BreadcrumbList JSON-LD from the same items the visual <Breadcrumbs />
 * component renders — one source of truth, so the structured data can
 * never drift from what's actually on the page (project brief Part I).
 */
export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.href ? `${siteConfig.url}${item.href}` : undefined,
    })),
  };
}

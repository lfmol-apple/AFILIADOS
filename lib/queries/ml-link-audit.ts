import { prisma } from "@/lib/db";
import { REAL_VISITOR_CLICKS_SQL } from "@/lib/admin/owner-traffic";

export interface MlLinkAuditSummary {
  activeLinks: number;
  duplicatedAffiliateUrls: number;
  duplicatedRows: number;
  clickedLast30d: number;
}

export interface MlDuplicateAffiliateLink {
  affiliateUrl: string;
  rows: {
    merchantListingId: string;
    title: string;
    publicUrl: string;
    clicksLast30d: number;
    totalClicks: number;
    lastClickAt: Date | null;
  }[];
}

export interface MlPriorityAffiliateLink {
  merchantListingId: string;
  title: string;
  publicUrl: string;
  affiliateUrl: string;
  clicksLast30d: number;
  totalClicks: number;
  lastClickAt: Date | null;
}

export interface MlLinkAudit {
  summary: MlLinkAuditSummary;
  duplicates: MlDuplicateAffiliateLink[];
  priorityReview: MlPriorityAffiliateLink[];
}

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Read-only Mercado Livre link audit. It never opens meli.la or Mercado Livre:
 * every signal comes from our own database, so it cannot generate marketplace
 * clicks or create automated browsing patterns.
 */
export async function getMlLinkAudit(): Promise<MlLinkAudit> {
  const since = new Date(Date.now() - DAYS_30_MS);

  const [summaryRows, duplicateRows, priorityRows] = await Promise.all([
    prisma.$queryRaw<
      {
        active_links: bigint;
        duplicated_affiliate_urls: bigint;
        duplicated_rows: bigint;
        clicked_last_30d: bigint;
      }[]
    >`
      with ml_links as (
        select al.id, al."affiliateUrl"
        from "AffiliateLinkRegistry" al
        join "Merchant" m on m.id = al."merchantId"
        where m.code = 'MERCADO_LIVRE'
          and al.status = 'ACTIVE'
          and al."affiliateUrl" is not null
      ),
      duplicated as (
        select "affiliateUrl", count(*) as link_count
        from ml_links
        group by "affiliateUrl"
        having count(*) > 1
      ),
      clicked as (
        select distinct ac."merchantListingId"
        from "AffiliateClick" ac
        join "Merchant" m on m.id = ac."merchantId"
        where m.code = 'MERCADO_LIVRE'
          and ac."createdAt" >= ${since}
          and ${REAL_VISITOR_CLICKS_SQL}
      )
      select
        (select count(*) from ml_links) as active_links,
        (select count(*) from duplicated) as duplicated_affiliate_urls,
        coalesce((select sum(link_count) from duplicated), 0) as duplicated_rows,
        (select count(*) from clicked) as clicked_last_30d
    `,
    prisma.$queryRaw<
      {
        affiliate_url: string;
        merchant_listing_id: string;
        title: string | null;
        public_url: string;
        clicks_last_30d: bigint;
        total_clicks: bigint;
        last_click_at: Date | null;
      }[]
    >`
      with ml_links as (
        select
          al."affiliateUrl",
          al."merchantListingId",
          al."publicUrl",
          coalesce(cp.title, p.title, ml.slug, ml."externalId", 'sem titulo') as title
        from "AffiliateLinkRegistry" al
        join "Merchant" m on m.id = al."merchantId"
        join "MerchantListing" ml on ml.id = al."merchantListingId"
        left join "CanonicalProduct" cp on cp.id = ml."canonicalProductId"
        left join "Product" p on p.id = ml."legacyProductId"
        where m.code = 'MERCADO_LIVRE'
          and al.status = 'ACTIVE'
          and al."affiliateUrl" is not null
      ),
      duplicated as (
        select "affiliateUrl"
        from ml_links
        group by "affiliateUrl"
        having count(*) > 1
      )
      select
        l."affiliateUrl" as affiliate_url,
        l."merchantListingId" as merchant_listing_id,
        l.title,
        l."publicUrl" as public_url,
        count(ac.id) filter (where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}) as clicks_last_30d,
        count(ac.id) filter (where ${REAL_VISITOR_CLICKS_SQL}) as total_clicks,
        max(ac."createdAt") filter (where ${REAL_VISITOR_CLICKS_SQL}) as last_click_at
      from ml_links l
      join duplicated d on d."affiliateUrl" = l."affiliateUrl"
      left join "AffiliateClick" ac on ac."merchantListingId" = l."merchantListingId"
      group by l."affiliateUrl", l."merchantListingId", l.title, l."publicUrl"
      order by l."affiliateUrl", clicks_last_30d desc, total_clicks desc, l.title
    `,
    prisma.$queryRaw<
      {
        merchant_listing_id: string;
        title: string | null;
        public_url: string;
        affiliate_url: string;
        clicks_last_30d: bigint;
        total_clicks: bigint;
        last_click_at: Date | null;
      }[]
    >`
      select
        al."merchantListingId" as merchant_listing_id,
        coalesce(cp.title, p.title, ml.slug, ml."externalId", 'sem titulo') as title,
        al."publicUrl" as public_url,
        al."affiliateUrl" as affiliate_url,
        count(ac.id) filter (where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}) as clicks_last_30d,
        count(ac.id) filter (where ${REAL_VISITOR_CLICKS_SQL}) as total_clicks,
        max(ac."createdAt") filter (where ${REAL_VISITOR_CLICKS_SQL}) as last_click_at
      from "AffiliateLinkRegistry" al
      join "Merchant" m on m.id = al."merchantId"
      join "MerchantListing" ml on ml.id = al."merchantListingId"
      left join "CanonicalProduct" cp on cp.id = ml."canonicalProductId"
      left join "Product" p on p.id = ml."legacyProductId"
      left join "AffiliateClick" ac on ac."merchantListingId" = al."merchantListingId"
      where m.code = 'MERCADO_LIVRE'
        and al.status = 'ACTIVE'
        and al."affiliateUrl" is not null
      group by al."merchantListingId", title, al."publicUrl", al."affiliateUrl"
      having count(ac.id) filter (where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}) > 0
      order by clicks_last_30d desc, total_clicks desc, last_click_at desc
      limit 100
    `,
  ]);

  const duplicates = new Map<string, MlDuplicateAffiliateLink>();
  for (const row of duplicateRows) {
    const group = duplicates.get(row.affiliate_url) ?? {
      affiliateUrl: row.affiliate_url,
      rows: [],
    };
    group.rows.push({
      merchantListingId: row.merchant_listing_id,
      title: row.title ?? "sem titulo",
      publicUrl: row.public_url,
      clicksLast30d: Number(row.clicks_last_30d),
      totalClicks: Number(row.total_clicks),
      lastClickAt: row.last_click_at,
    });
    duplicates.set(row.affiliate_url, group);
  }

  return {
    summary: {
      activeLinks: Number(summaryRows[0]?.active_links ?? 0),
      duplicatedAffiliateUrls: Number(
        summaryRows[0]?.duplicated_affiliate_urls ?? 0,
      ),
      duplicatedRows: Number(summaryRows[0]?.duplicated_rows ?? 0),
      clickedLast30d: Number(summaryRows[0]?.clicked_last_30d ?? 0),
    },
    duplicates: [...duplicates.values()],
    priorityReview: priorityRows.map((row) => ({
      merchantListingId: row.merchant_listing_id,
      title: row.title ?? "sem titulo",
      publicUrl: row.public_url,
      affiliateUrl: row.affiliate_url,
      clicksLast30d: Number(row.clicks_last_30d),
      totalClicks: Number(row.total_clicks),
      lastClickAt: row.last_click_at,
    })),
  };
}

import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { getValidMercadoLivreAccessToken, createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import { MercadoLivreTrendsDemandSource } from "@/lib/demand/sources/mercado-livre-trends-demand-source";
import { searchMercadoLivreByKeyword } from "@/lib/demand/sources/mercado-livre-keyword-search";
import { ensureMercadoLivreMerchant, persistHighlightSignal } from "@/lib/services/ml-demand-collector";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import { getActiveCommercialEvents } from "@/lib/services/commercial-calendar-engine";
import { fetchTopLevelCategories } from "@/lib/services/commercial-intelligence/ml-category-tree";
import { persistTrendObservations } from "@/lib/services/commercial-intelligence/trends-history";
import { registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

const RESULTS_PER_KEYWORD = 5;
const TRENDING_KEYWORDS_PER_CYCLE = 10;

interface EventSearchReport {
  eventId: string;
  eventName: string;
  eventType: string;
  stage: string;
  daysUntilPeak: number;
  mechanism: "keyword_search" | "category_bestseller";
  keywordsSearched: string[];
  categoriesScanned: string[];
  resultsFound: number;
  created: number;
  updated: number;
  errors: number;
  discardedNotGenuinelyRelated: number;
  /** Owner's authorization, 2026-11-19, section 5: real ids this run
   * found but could not resolve into a title — never silently dropped,
   * counted here by reason so coverage is auditable per category/event. */
  unresolved: { userProductPrivateCatalog: number; nameResolutionFailed: number };
}

/**
 * Owner's correction, 2026-11-19 (re-confirmed live in homologation the
 * same day): ML's catalog search does loose token matching, so a
 * multi-word search phrase can still return a product whose title shares
 * a common word (e.g. "roupa"/"branca") but is not actually about the
 * event. When an event declares `requiredAnchorTerms`, a result's title
 * must contain at least one of them (accent/case-insensitive) to be
 * accepted — see lib/config/commercial-calendar.ts's field doc for the
 * real example this caught.
 */
export function titleHasRequiredAnchor(title: string, anchorTerms: readonly string[] | undefined): boolean {
  if (!anchorTerms || anchorTerms.length === 0) return true;
  const normalized = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return anchorTerms.some((term) =>
    normalized.includes(
      term
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, ""),
    ),
  );
}

/**
 * Vitrine Inteligente — real, mechanism-appropriate discovery per event
 * TYPE (owner's correction, 2026-11-19, sections 3 and 7):
 *
 *  - THEMATIC events (Natal, Halloween, Réveillon, Carnaval, Páscoa, Dia
 *    das Mães/Pais/Crianças) are searched by their own real keywords
 *    (searchMercadoLivreByKeyword) — the product's purpose genuinely
 *    matches the word.
 *  - PROMOTIONAL events (Black Friday, Cyber Monday, Dia do Consumidor)
 *    are NEVER keyword-searched by their own name — "Bexiga Black
 *    Friday" is a balloon, not a Black Friday opportunity (found live,
 *    2026-11-19). Instead this scans real category bestseller highlights
 *    (MercadoLivreBestsellerDemandSource) across BOTH the event's own
 *    categoryIds AND every real top-level ML category
 *    (ml-category-tree.ts) — broader than the 13 hand-picked rotation
 *    categories, per the owner's "não limite a descoberta aos produtos
 *    existentes" instruction. A promotional-event find is only treated
 *    as genuinely event-relevant once a real price drop is later
 *    confirmed (lib/services/vitrine-selection.ts's eligibility gate for
 *    this event type) — being merely in a scanned category is not
 *    evidence of a Black Friday deal by itself.
 *
 * A second, separate sweep covers the calendar-independent case:
 * Mercado Livre's own site-wide trending-keyword endpoint, resolved into
 * real catalog items the same way, AND now persisted
 * (persistTrendObservations) so PreçoCaindo builds its own trend history
 * instead of discarding it every cycle (section 3).
 *
 * Every find is enriched immediately (real title/photo/price/category)
 * — without this, a freshly-discovered item has no CanonicalProduct and
 * is invisible to selection (found live, 2026-11-19).
 */
export async function runVitrineDiscoveryJob() {
  return runJob(
    "VITRINE_DISCOVERY",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        throw new Error(
          "VITRINE_DISCOVERY requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED.",
        );
      }

      const merchant = await ensureMercadoLivreMerchant();
      const getAccessToken = () => getValidMercadoLivreAccessToken();
      const provider = await createMercadoLivreProvider();
      const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();

      async function enrich(listing: { id: string; externalId: string; canonicalProductId: string | null }) {
        try {
          await enrichCatalogListing(provider, merchant.id, listing, 60, sellerCache);
        } catch (err) {
          logger.error("vitrine_discovery.enrich_failed", {
            externalId: listing.externalId,
            message: String(err),
          });
        }
      }

      const activeEvents = getActiveCommercialEvents();
      const eventReports: EventSearchReport[] = [];

      const thematicEvents = activeEvents.filter((a) => a.event.eventType === "tematico");
      const promotionalEvents = activeEvents.filter((a) => a.event.eventType === "promocional");

      // Thematic: keyword-driven, per event's own real-purpose terms.
      for (const active of thematicEvents) {
        const report: EventSearchReport = {
          eventId: active.event.id,
          eventName: active.event.name,
          eventType: active.event.eventType,
          stage: active.stage,
          daysUntilPeak: active.daysUntilPeak,
          mechanism: "keyword_search",
          keywordsSearched: [...active.event.keywords],
          categoriesScanned: [],
          resultsFound: 0,
          created: 0,
          updated: 0,
          errors: 0,
          discardedNotGenuinelyRelated: 0,
          unresolved: { userProductPrivateCatalog: 0, nameResolutionFailed: 0 },
        };

        for (const keyword of active.event.keywords) {
          try {
            const results = await withRetry(
              () => searchMercadoLivreByKeyword(keyword, getAccessToken, RESULTS_PER_KEYWORD),
              { label: `vitrine_discovery.event.${active.event.id}.${keyword}` },
            );
            report.resultsFound += results.length;

            for (const [index, result] of results.entries()) {
              if (!titleHasRequiredAnchor(result.title, active.event.requiredAnchorTerms)) {
                report.discardedNotGenuinelyRelated += 1;
                logger.info("vitrine_discovery.event_result_not_genuinely_related", {
                  eventId: active.event.id,
                  keyword,
                  title: result.title,
                });
                continue;
              }
              const existing = await prisma.merchantListing.findUnique({
                where: {
                  merchantId_marketplace_externalId: {
                    merchantId: merchant.id,
                    marketplace: "BR",
                    externalId: result.itemId,
                  },
                },
                select: { id: true },
              });
              const listing = await persistHighlightSignal({
                merchantId: merchant.id,
                itemId: result.itemId,
                position: index + 1,
                discoverySource: "VITRINE_SEASONAL",
                matchedEventId: active.event.id,
                matchedKeyword: keyword,
              });
              if (!listing.canonicalProductId) await enrich(listing);
              await registerCandidate({
                externalId: result.itemId,
                merchantListingId: listing.id,
                sourceType: "seasonal_keyword",
                sourceDetail: { keyword, eventId: active.event.id, eventName: active.event.name, position: index + 1 },
              });
              if (existing) {
                report.updated += 1;
                ctx.counters.updated += 1;
              } else {
                report.created += 1;
                ctx.counters.created += 1;
              }
              ctx.counters.processed += 1;
            }
          } catch (err) {
            logger.error("vitrine_discovery.event_keyword_failed", {
              eventId: active.event.id,
              keyword,
              message: String(err),
            });
            report.errors += 1;
            ctx.counters.errors += 1;
          }
        }
        eventReports.push(report);
      }

      // Promotional: category-bestseller-driven, never keyword-driven by
      // the event's own name — see this job's doc comment.
      if (promotionalEvents.length > 0) {
        const categoryIds = new Set<string>();
        for (const active of promotionalEvents) {
          for (const categoryId of active.event.categoryIds) categoryIds.add(categoryId);
        }
        try {
          const topLevel = await fetchTopLevelCategories(getAccessToken);
          for (const c of topLevel) categoryIds.add(c.id);
        } catch (err) {
          logger.error("vitrine_discovery.category_tree_failed", { message: String(err) });
        }

        for (const active of promotionalEvents) {
          const report: EventSearchReport = {
            eventId: active.event.id,
            eventName: active.event.name,
            eventType: active.event.eventType,
            stage: active.stage,
            daysUntilPeak: active.daysUntilPeak,
            mechanism: "category_bestseller",
            keywordsSearched: [],
            categoriesScanned: [...categoryIds],
            resultsFound: 0,
            created: 0,
            updated: 0,
            errors: 0,
            discardedNotGenuinelyRelated: 0,
            unresolved: { userProductPrivateCatalog: 0, nameResolutionFailed: 0 },
          };

          for (const categoryId of categoryIds) {
            try {
              const source = new MercadoLivreBestsellerDemandSource(
                categoryId,
                (id) => provider.getCatalogProductName(id),
                getAccessToken,
              );
              const { resolved: highlights, unresolved } = await withRetry(
                () => source.collectRawWithUnresolved(),
                { label: `vitrine_discovery.promo.${active.event.id}.${categoryId}` },
              );
              report.resultsFound += highlights.length;

              for (const u of unresolved) {
                if (u.reason === "user_product_private_catalog") report.unresolved.userProductPrivateCatalog += 1;
                else report.unresolved.nameResolutionFailed += 1;
                await registerCandidate({
                  externalId: u.itemId,
                  merchantListingId: null,
                  sourceType: "official_rank",
                  sourceDetail: { eventId: active.event.id, categoryId, position: u.position, type: u.type },
                  categoryId,
                  unresolvedReason: u.reason,
                });
              }

              for (const h of highlights) {
                const existing = await prisma.merchantListing.findUnique({
                  where: {
                    merchantId_marketplace_externalId: {
                      merchantId: merchant.id,
                      marketplace: "BR",
                      externalId: h.itemId,
                    },
                  },
                  select: { id: true },
                });
                const listing = await persistHighlightSignal({
                  merchantId: merchant.id,
                  itemId: h.itemId,
                  position: h.position,
                  categoryId,
                  discoverySource: "VITRINE_SEASONAL",
                  matchedEventId: active.event.id,
                  // Deliberately NO matchedKeyword here — a category-
                  // bestseller find is not a keyword match, and
                  // vitrine-selection.ts uses the absence of
                  // matchedKeyword (for a promotional event) to require
                  // a real price drop before treating it as relevant.
                });
                if (!listing.canonicalProductId) await enrich(listing);
                await registerCandidate({
                  externalId: h.itemId,
                  merchantListingId: listing.id,
                  sourceType: "official_rank",
                  sourceDetail: { eventId: active.event.id, categoryId, position: h.position, title: h.title },
                  categoryId,
                });
                if (existing) {
                  report.updated += 1;
                  ctx.counters.updated += 1;
                } else {
                  report.created += 1;
                  ctx.counters.created += 1;
                }
                ctx.counters.processed += 1;
              }
            } catch (err) {
              logger.error("vitrine_discovery.promo_category_failed", {
                eventId: active.event.id,
                categoryId,
                message: String(err),
              });
              report.errors += 1;
              ctx.counters.errors += 1;
            }
          }
          eventReports.push(report);
        }
      }

      ctx.metadata.eventSearches = eventReports;

      // Cross-category, calendar-independent trending keywords — now
      // persisted (section 3), not discarded.
      try {
        const trends = await withRetry(
          () => new MercadoLivreTrendsDemandSource(undefined, getAccessToken).collect(),
          { label: "vitrine_discovery.trends" },
        );
        await persistTrendObservations(
          trends.map((t, i) => ({ keyword: t.keyword, rank: i + 1 })),
        );

        const topKeywords = trends.slice(0, TRENDING_KEYWORDS_PER_CYCLE);
        ctx.metadata.trendingKeywordsScanned = topKeywords.map((t) => t.keyword);

        let trendingFound = 0;
        for (const trend of topKeywords) {
          try {
            const results = await withRetry(
              () => searchMercadoLivreByKeyword(trend.keyword, getAccessToken, RESULTS_PER_KEYWORD),
              { label: `vitrine_discovery.keyword_search.${trend.keyword}` },
            );
            trendingFound += results.length;
            for (const [index, result] of results.entries()) {
              const existing = await prisma.merchantListing.findUnique({
                where: {
                  merchantId_marketplace_externalId: {
                    merchantId: merchant.id,
                    marketplace: "BR",
                    externalId: result.itemId,
                  },
                },
                select: { id: true },
              });
              const listing = await persistHighlightSignal({
                merchantId: merchant.id,
                itemId: result.itemId,
                position: index + 1,
                discoverySource: "VITRINE_TRENDING",
                matchedKeyword: trend.keyword,
              });
              if (!listing.canonicalProductId) await enrich(listing);
              await registerCandidate({
                externalId: result.itemId,
                merchantListingId: listing.id,
                sourceType: "trend_keyword",
                sourceDetail: { keyword: trend.keyword, position: index + 1 },
              });
              if (existing) ctx.counters.updated += 1;
              else ctx.counters.created += 1;
              ctx.counters.processed += 1;
            }
          } catch (err) {
            logger.error("vitrine_discovery.keyword_failed", {
              keyword: trend.keyword,
              message: String(err),
            });
            ctx.counters.errors += 1;
          }
        }
        ctx.metadata.trendingResultsFound = trendingFound;
      } catch (err) {
        logger.error("vitrine_discovery.trends_failed", { message: String(err) });
        ctx.counters.errors += 1;
      }
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runVitrineDiscoveryJob()
    .then((counters) => {
      console.log("VITRINE_DISCOVERY done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("VITRINE_DISCOVERY failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

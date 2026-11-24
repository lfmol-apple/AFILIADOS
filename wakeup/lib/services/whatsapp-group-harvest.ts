import type { WASocket } from "baileys";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import {
  extractUrls,
  classifyMerchantUrl,
  isShortenedShopeeUrl,
  extractShopeeItemId,
  extractMlCatalogId,
  isShortenedAmazonUrl,
  extractAmazonAsinFromUrl,
  extractPriceHints,
  extractTitleHint,
} from "@/lib/whatsapp/group-link-extract";
import { ShopeeProvider } from "@/lib/providers/shopee-provider";
import { processShopeeOffer } from "@/lib/services/shopee-cycle-collector";
import { ensureMercadoLivreMerchant } from "@/lib/services/ml-demand-collector";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import { buildItemFromMerchantFacts } from "@/lib/queries/whatsapp-trending-today";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";
import { sendWhatsAppMessages } from "@/lib/services/whatsapp-sender";
import { isValidAsin } from "@/lib/amazon/policy-guard";
import { classifyOffer } from "@/lib/offers/categories";
import { registerManualVerifiedProduct } from "@/lib/services/manual-product-registration";
import { recordManualPriceObservation } from "@/lib/services/manual-price-entry";
import { saveProductImage } from "@/lib/services/product-image-store";

const HARVEST_SOURCE = "whatsapp_group";
const ML_CANDIDATE_SOURCE = "whatsapp_group_candidate";

/** Owner's brief, 2026-11-18: "pegar carona em grupos de promoção" —
 * originally meant joining promo groups directly with the bot number,
 * dropped the same day after the bot got removed from one for looking
 * automated. Final shape: the owner stays in those groups on his own
 * phone/account (zero extra risk there) and forwards whatever he wants
 * monetized to the bot's own DM or into our own Group
 * (jobs/whatsapp-harvest.ts decides which messages qualify); this
 * function just turns that message's text into real site inventory —
 * Shopee (fully automatic, real API), Mercado Livre (candidate only, no
 * API), Amazon (automatic using the owner's own forwarded text as the
 * source of truth, see captureAmazonItem's doc comment). It never
 * replies/reacts/sends anything back into a third-party group — only
 * ever reads text and writes to our own database. */
export interface HarvestResult {
  urlsFound: number;
  shopeeLinked: number;
  shopeeSkipped: number;
  mlCandidatesCaptured: number;
  amazonActivated: number;
  amazonSkipped: number;
  ignored: number;
}

/** Follows redirects (shortened Shopee links carry no itemId themselves)
 * without ever sending a request as this harvester's own identity —
 * a generic browser UA, same spirit as the rest of this codebase's
 * outbound fetches, so a dead/expired short link just 404s quietly. */
async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; PrecoCaindoBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

/**
 * Posts the just-linked product to our own Group right away, same
 * caption style as the daily digest (buildWhatsAppItemCaption) — owner's
 * brief, 2026-11-18: "após entrar no site, enviar já com link direto e
 * monetizado... no grupo. Eu pego do grupo e coloco no canal." Reuses the
 * sock the caller already has open (sendWhatsAppMessages' sockOverride),
 * so this never opens a second WhatsApp connection. Best-effort: a post
 * failure here must never undo the real site listing/link that already
 * saved successfully.
 */
async function postNewShopeeItemToGroup(merchantListingId: string, sock: WASocket): Promise<void> {
  const facts = await loadMerchantListingFactsByListingId(merchantListingId);
  if (!facts) return;
  const item = buildItemFromMerchantFacts(facts);
  if (!item) return; // no real price/link yet — nothing honest to post
  try {
    await sendWhatsAppMessages([{ text: buildWhatsAppItemCaption(item), imageUrl: item.imageUrl }], sock);
  } catch (err) {
    logger.warn("whatsapp_harvest.group_post_failed", { merchantListingId, message: String(err) });
  }
}

async function handleShopeeUrl(
  url: string,
  sock: WASocket,
): Promise<"posted" | "already_linked" | "skipped"> {
  const resolved = isShortenedShopeeUrl(url) ? await resolveFinalUrl(url) : url;
  const itemId = extractShopeeItemId(resolved);
  if (itemId === null) return "skipped";

  const provider = new ShopeeProvider();
  const nodes = await provider.listOffers({ itemId, limit: 1 });
  const offer = nodes[0];
  if (!offer) return "skipped"; // delisted, or not a real catalog item

  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true, affiliateEnabled: true },
    update: { affiliateEnabled: true },
  });

  // Monetize BEFORE anything is posted anywhere — owner's brief, 2026-11-18
  // ("isso depois de transformar em monetizado"). processShopeeOffer does
  // exactly that in one call: real offer data in, our own ACTIVE sub_id1=
  // precocaindo link out, nothing published with a foreign/raw link.
  const result = await processShopeeOffer(provider, merchant.id, offer, HARVEST_SOURCE);
  if (!result.linkGenerated) return "already_linked"; // seen before — don't repost to the Group

  const listing = await prisma.merchantListing.findUniqueOrThrow({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: String(offer.itemId),
      },
    },
    select: { id: true },
  });
  await postNewShopeeItemToGroup(listing.id, sock);
  return "posted";
}

/** Mercado Livre has no affiliate API (unchanged project constraint) — a
 * link found in a group can only become a real monetized link once the
 * owner generates it by hand in the panel's Linkbuilder, same as every
 * other ML product on this site. This just captures the candidate (real
 * title/photo/price via the same enrichment the manual queue already
 * trusts) so it shows up ready to act on in /admin/fila-links, instead of
 * the owner having to go re-find the product in the panel themselves. */
async function captureMlCandidate(catalogId: string, productUrl: string): Promise<boolean> {
  const merchant = await ensureMercadoLivreMerchant();
  const existingLink = await prisma.affiliateLinkRegistry.findFirst({
    where: {
      status: "ACTIVE",
      merchantListing: { merchantId: merchant.id, externalId: catalogId },
    },
    select: { id: true },
  });
  if (existingLink) return false; // already linked — nothing new to surface

  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: merchant.id,
        marketplace: "BR",
        externalId: catalogId,
      },
    },
    create: {
      merchantId: merchant.id,
      externalId: catalogId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl,
      source: "MANUAL_VERIFIED",
    },
    update: {},
  });

  try {
    const provider = await createMercadoLivreProvider();
    await enrichCatalogListing(provider, merchant.id, listing, 60, new Map());
  } catch (err) {
    logger.warn("whatsapp_harvest.ml_enrich_failed", { catalogId, message: String(err) });
  }

  // Idempotent on purpose: the same product shared twice in the group
  // should not pile up duplicate candidate rows.
  const already = await prisma.merchantListingSignal.findFirst({
    where: { merchantListingId: listing.id, source: ML_CANDIDATE_SOURCE },
    select: { id: true },
  });
  if (!already) {
    await prisma.merchantListingSignal.create({
      data: {
        merchantListingId: listing.id,
        source: ML_CANDIDATE_SOURCE,
        raw: { productUrl, capturedAt: new Date().toISOString() },
      },
    });
  }
  return true;
}

/**
 * Builds the one-line, original PreçoCaindo description every
 * MANUAL_VERIFIED Amazon product needs (manual-product-registration.ts's
 * own rule: never the Amazon listing's own copy). The owner's forwarded
 * message is itself the real, human-chosen source here — same standing
 * as ml-panel-register.ts trusting the panel title the owner saw — so
 * this states only the one real fact we have (the title) plus a fixed,
 * non-factual disclosure line; it never repeats whatever marketing text
 * the coupon post itself carried.
 */
function buildHarvestDescription(title: string): string {
  return `${title}. Oferta encontrada e selecionada manualmente para o PreçoCaindo, com link de afiliado Amazon verificado.`;
}

/**
 * Amazon has no usable discovery API right now (Creators API still
 * blocked by AssociateNotEligible, AmazonProvider.getProduct is a stub —
 * see docs/AMAZON_COMPLIANCE.md) and this codebase has a deliberate,
 * long-standing rule against scraping or fabricating Amazon product data
 * (lib/services/manual-price-entry.ts's own doc comment). What IS real
 * and safe to use automatically: the ASIN (identifies a real product),
 * buildAmazonProductUrl (just appends our own tag, no guessing), and —
 * owner's explicit call, 2026-11-18, after being asked directly — the
 * title/price the owner HIMSELF chose to forward, which this project
 * already treats the same way it treats an owner-supplied panel title
 * elsewhere (registerPanelPick). `thumbnail`, when present, is WhatsApp's
 * own link-preview photo of the real product page — see
 * lib/services/product-image-store.ts's doc comment for why that's a
 * legitimate, non-fabricated image source (unlike the Amazon listing's
 * own copy, which is never reused). Still never posted to the Group:
 * even with a real photo, there's no legitimate automatic monetized
 * "view" for Amazon the way Shopee's offer link is — the owner forwards
 * from the product page itself to the Channel if he wants to promote it
 * there.
 */
async function captureAmazonItem(
  url: string,
  messageText: string,
  thumbnail: Uint8Array | null,
): Promise<"activated" | "updated" | "already_active" | "skipped"> {
  const resolved = isShortenedAmazonUrl(url) ? await resolveFinalUrl(url) : url;
  const asin = extractAmazonAsinFromUrl(resolved);
  if (!asin || !isValidAsin(asin)) return "skipped";

  const priceHints = extractPriceHints(messageText);
  if (!priceHints) return "skipped"; // no real price stated — nothing honest to publish

  const existing = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin } },
  });

  if (existing) {
    // Backfilling a missing photo on an already-published item is safe
    // (never touches price/title); re-harvesting the same product
    // otherwise is a deliberate no-op — never silently alter a live
    // price unattended.
    if (existing.active) {
      if (!existing.imageUrl && thumbnail) {
        const imageUrl = saveProductImage(asin, thumbnail);
        if (imageUrl) await prisma.product.update({ where: { id: existing.id }, data: { imageUrl } });
      }
      return "already_active";
    }
    return "skipped"; // exists as a draft already (e.g. missing required fields before) — leave for manual follow-up
  }

  const title = extractTitleHint(messageText);
  if (!title) return "skipped"; // no honest title to use — never invent one

  const categorySlug = classifyOffer({ title });
  const registered = await registerManualVerifiedProduct({
    asin,
    marketplace: "BR",
    title,
    description: buildHarvestDescription(title),
    categorySlug,
  });
  if (!registered.ok) {
    logger.warn("whatsapp_harvest.amazon_register_failed", { asin, error: registered.error });
    return "skipped";
  }

  const priced = await recordManualPriceObservation({
    asin,
    marketplace: "BR",
    price: priceHints.salePrice,
    originalPrice: priceHints.originalPrice,
  });
  if (!priced.ok) {
    logger.warn("whatsapp_harvest.amazon_price_failed", { asin, error: priced.error });
    return "skipped"; // left as an inactive draft — never activated without a real price on it
  }

  const imageUrl = thumbnail ? saveProductImage(asin, thumbnail) : null;
  await prisma.product.update({
    where: { id: registered.product.id },
    data: { active: true, ...(imageUrl ? { imageUrl } : {}) },
  });
  return "activated";
}

/**
 * One message's text in, real work out — never throws (every URL is
 * isolated in its own try/catch, same "one failure can't lose the rest"
 * convention every job in this codebase already follows). Called from
 * jobs/whatsapp-harvest.ts, which already verified the message is really
 * from the owner (env.WHATSAPP_OWNER_PERSONAL_JID) before getting here.
 * `sock` is that job's own already-open connection — reused here (never
 * a second one) to post a freshly-linked Shopee item straight to the
 * Group.
 */
export async function harvestGroupMessageText(
  text: string,
  sock: WASocket,
  thumbnail: Uint8Array | null = null,
): Promise<HarvestResult> {
  const result: HarvestResult = {
    urlsFound: 0,
    shopeeLinked: 0,
    shopeeSkipped: 0,
    mlCandidatesCaptured: 0,
    amazonActivated: 0,
    amazonSkipped: 0,
    ignored: 0,
  };

  const urls = extractUrls(text);
  result.urlsFound = urls.length;

  for (const url of urls) {
    const merchant = classifyMerchantUrl(url);
    if (!merchant) {
      result.ignored += 1; // "limpar ruídos" — not a Shopee/ML link at all
      continue;
    }
    try {
      if (merchant === "SHOPEE") {
        const outcome = await handleShopeeUrl(url, sock);
        if (outcome === "skipped") result.shopeeSkipped += 1;
        else result.shopeeLinked += 1; // "posted" or "already_linked" — both real, monetized site inventory
      } else if (merchant === "MERCADO_LIVRE") {
        const catalogId = extractMlCatalogId(url);
        if (!catalogId) {
          result.ignored += 1;
          continue;
        }
        const captured = await captureMlCandidate(catalogId, url);
        if (captured) result.mlCandidatesCaptured += 1;
      } else {
        const outcome = await captureAmazonItem(url, text, thumbnail);
        if (outcome === "activated" || outcome === "already_active") result.amazonActivated += 1;
        else result.amazonSkipped += 1;
      }
    } catch (err) {
      logger.error("whatsapp_harvest.url_failed", { url, merchant, message: String(err) });
    }
  }

  return result;
}

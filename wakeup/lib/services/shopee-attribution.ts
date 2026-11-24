import { env } from "@/lib/config/env";

/** Shopee sub_ids are alphanumeric only — strips everything else rather
 * than rejecting, since a source/category/campaign label may legitimately
 * contain spaces/accents/punctuation before normalization (e.g. "Black
 * Friday" -> "BlackFriday"). Never silently truncates below 1 char; an
 * input that normalizes to empty is dropped by buildShopeeSubIds. */
export function normalizeSubId(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-zA-Z0-9]/g, "");
}

export interface ShopeeAttributionInput {
  /** e.g. "admin_queue", "showcase", "widget" */
  source?: string;
  category?: string;
  campaign?: string;
  /** MerchantListing id or another internal identifier for the specific
   * opportunity being promoted — lets a later conversionReport pull be
   * traced back to the exact listing without a separate lookup table. */
  opportunityId?: string;
}

/**
 * Builds the ordered sub_id array Shopee's generateShortLink expects.
 * sub_id1 is always SHOPEE_SUB_ID1 (project attribution — never omitted,
 * never overridable per-call, since that's the whole point: distinguishing
 * PreçoCaindo's revenue from anything else moving through the same
 * account). Positions 2-5 are source/category/campaign/opportunityId, in
 * that fixed order — trailing empty slots are dropped, but an empty slot
 * followed by a filled one is kept as "" rather than shifting positions,
 * since Shopee's API is positional (sub_id2 always means "source", never
 * "whichever optional field happened to be set").
 */
export function buildShopeeSubIds(input: ShopeeAttributionInput): string[] {
  const slots = [
    normalizeSubId(env.SHOPEE_SUB_ID1),
    input.source ? normalizeSubId(input.source) : "",
    input.category ? normalizeSubId(input.category) : "",
    input.campaign ? normalizeSubId(input.campaign) : "",
    input.opportunityId ? normalizeSubId(input.opportunityId) : "",
  ];

  let lastNonEmpty = 0;
  slots.forEach((slot, i) => {
    if (slot.length > 0) lastNonEmpty = i;
  });

  return slots.slice(0, lastNonEmpty + 1);
}

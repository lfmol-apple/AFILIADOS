/**
 * Mercado Livre catalog ids (externalId) pinned to the very top of
 * /ofertas, ahead of the normal MonetizationScore-ranked pool — owner's
 * request, 2026-11-27, for the 45 products pulled from the two aborted
 * Black Friday campaigns (see scripts/register-black-friday-retired.ts).
 * Order here IS the display order (highest real price first — never a
 * fabricated score, since these never came from the affiliate panel and
 * have no real commission/sold data to rank by). Empty list = no pin,
 * /ofertas behaves exactly as before.
 */
export const PINNED_OFFER_EXTERNAL_IDS: readonly string[] = [];

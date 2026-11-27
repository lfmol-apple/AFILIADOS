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
export const PINNED_OFFER_EXTERNAL_IDS: readonly string[] = [
  "MLB56721548", "MLB72018722", "MLB29001054", "MLB60385574", "MLB29699966",
  "MLB61372830", "MLB75681241", "MLB76156293", "MLB45248118", "MLB64307757",
  "MLB53624671", "MLB80139594", "MLB63752255", "MLB45804798", "MLB51757209",
  "MLB51396300", "MLB29239223", "MLB67462015", "MLB77671293", "MLB24070645",
  "MLB46220740", "MLB66518584", "MLB50269368", "MLB32529104", "MLB19635464",
  "MLB38224820", "MLB52162585", "MLB38833473", "MLB22234448", "MLB27705742",
  "MLB69742713", "MLB30144703", "MLB-4824049721", "MLB55232692", "MLB18218400",
  "MLB68039511", "MLB69621080", "MLB64322156", "MLB22857151", "MLB24609499",
  "MLB21361292", "MLB30890350", "MLB24326256", "MLB19508914", "MLB66699406",
];

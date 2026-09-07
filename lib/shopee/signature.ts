import { createHash } from "node:crypto";

/**
 * Shopee Affiliate API request signing — confirmed formula (see
 * docs/AFFILIATE_LINK_REGISTRY.md for the research trail):
 *
 *   Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}
 *   Signature = SHA256(AppId + Timestamp + Payload + SecretKey)
 *
 * `payload` must be the *exact* JSON string sent as the request body —
 * computing the signature from a re-serialized object risks a mismatch if
 * key order/whitespace differs, so callers must pass the literal string
 * they're about to send, not the object.
 */
export function buildShopeeAuthorizationHeader(input: {
  appId: string;
  secretKey: string;
  timestamp: number;
  payload: string;
}): string {
  const signature = createHash("sha256")
    .update(`${input.appId}${input.timestamp}${input.payload}${input.secretKey}`)
    .digest("hex");

  return `SHA256 Credential=${input.appId}, Timestamp=${input.timestamp}, Signature=${signature}`;
}

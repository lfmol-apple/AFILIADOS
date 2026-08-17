import type { CommerceProvider } from "@/types/commerce";
import { env } from "@/lib/config/env";
import { MockAmazonProvider } from "./mock-amazon-provider";
import { AmazonProvider } from "./amazon-provider";

let cachedProvider: CommerceProvider | undefined;

/** Selects the active CommerceProvider from AMAZON_PROVIDER. No other code
 * should instantiate a provider directly. */
export function getCommerceProvider(): CommerceProvider {
  if (!cachedProvider) {
    cachedProvider =
      env.AMAZON_PROVIDER === "live"
        ? new AmazonProvider()
        : new MockAmazonProvider();
  }
  return cachedProvider;
}

export { MockAmazonProvider } from "./mock-amazon-provider";
export { AmazonProvider } from "./amazon-provider";
export { MOCK_CATALOG } from "./mock-catalog";

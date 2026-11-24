import type { ContentProvider } from "@/types/content";
import { env } from "@/lib/config/env";
import { MockContentProvider } from "./mock-content-provider";
import { OpenAIContentProvider } from "./openai-content-provider";
import { AnthropicContentProvider } from "./anthropic-content-provider";

/** Selects the active ContentProvider from CONTENT_GENERATION. Returns null
 * when generation is off — callers (GENERATE_CONTENT job) must treat that as
 * a no-op, not an error. */
export function getContentProvider(): ContentProvider | null {
  switch (env.CONTENT_GENERATION) {
    case "mock":
      return new MockContentProvider();
    case "openai":
      return new OpenAIContentProvider();
    case "anthropic":
      return new AnthropicContentProvider();
    case "off":
      return null;
  }
}

export { MockContentProvider } from "./mock-content-provider";
export { OpenAIContentProvider } from "./openai-content-provider";
export { AnthropicContentProvider } from "./anthropic-content-provider";

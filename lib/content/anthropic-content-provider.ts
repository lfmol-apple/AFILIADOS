import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  ContentProvider,
} from "@/types/content";
import { env } from "@/lib/config/env";

/**
 * Not implemented yet. A personal Claude subscription is not an API — this
 * provider must only be activated with a real Anthropic API key, kept out of
 * the browser bundle, and it must still obey the no-hallucination contract
 * (project brief sections 14-15) once implemented.
 */
export class AnthropicContentProvider implements ContentProvider {
  readonly name = "anthropic";

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "AnthropicContentProvider requires ANTHROPIC_API_KEY. Configure a real API key or set " +
          "CONTENT_GENERATION=mock. See docs/CONTENT_ENGINE.md.",
      );
    }
  }

  async generate(
    _request: ContentGenerationRequest,
  ): Promise<ContentGenerationResult> {
    throw new Error(
      "AnthropicContentProvider.generate is not implemented yet. See docs/CONTENT_ENGINE.md.",
    );
  }
}

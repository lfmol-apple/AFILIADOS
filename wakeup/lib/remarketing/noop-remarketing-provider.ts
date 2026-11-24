import type { RemarketingEvent, RemarketingProvider } from "./types";

/**
 * The only active RemarketingProvider today. Deliberately does nothing —
 * no pixel, no third-party call, no audience building. Exists so the rest
 * of the codebase can depend on the RemarketingProvider interface (e.g. a
 * future "notify remarketing on product view" call site) without that call
 * site needing to change when a real provider is implemented later.
 */
export class NoopRemarketingProvider implements RemarketingProvider {
  readonly name = "noop";

  async track(_event: RemarketingEvent): Promise<void> {
    // Intentionally does nothing. See docs/REMARKETING.md for what
    // activating a real provider (Google Ads / Meta) will require:
    // explicit MARKETING consent per event, and PAID_MEDIA=true.
  }
}

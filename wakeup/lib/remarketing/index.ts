import type { RemarketingProvider } from "./types";
import { NoopRemarketingProvider } from "./noop-remarketing-provider";

export type { RemarketingEvent, RemarketingProvider } from "./types";
export { NoopRemarketingProvider } from "./noop-remarketing-provider";

/**
 * Always returns NoopRemarketingProvider today — there is no
 * PAID_MEDIA-gated selection logic yet because PAID_MEDIA stays false
 * (project brief section 62/Part L). When a real provider is implemented,
 * this is the only place that needs to change.
 */
export function getRemarketingProvider(): RemarketingProvider {
  return new NoopRemarketingProvider();
}

import { logger } from "@/lib/observability/logger";

/**
 * Shared retry/backoff for the automated ML/Shopee jobs (Automação
 * Operacional V1, 2026-09-08 — project brief section "retry/backoff").
 * Every provider method in this codebase (MercadoLivreProvider,
 * ShopeeProvider) throws a plain `Error` whose message ends in
 * `HTTP ${status}` on a non-2xx response (see e.g.
 * lib/providers/mercado-livre-provider.ts) — this wraps that convention
 * rather than changing it, so no provider code needs to change.
 *
 * Explicit classification (project brief, verbatim): transient errors
 * (timeout, 429, 5xx, connection failure) get bounded retry with
 * exponential backoff; 401/invalid-token/missing-config/unexpected-schema
 * errors are NOT retried — they need a human, and retrying them just
 * burns API budget and hides the real problem.
 */

export interface RetryOptions {
  /** Total attempts, including the first — default 3 (so up to 2 retries). */
  attempts?: number;
  /** Base delay before the first retry; doubles each subsequent attempt. */
  baseDelayMs?: number;
  /** For logging/metadata only — which job/call this retry belongs to. */
  label?: string;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const httpMatch = message.match(/HTTP (\d+)/);
  if (httpMatch) {
    return RETRYABLE_STATUS.has(Number(httpMatch[1]));
  }
  // No HTTP status in the message — either a network-level failure (fetch
  // itself rejected: DNS, connection reset, timeout) or something this
  // function doesn't recognize. Only the former is safe to retry blindly;
  // an unrecognized error (e.g. a JSON parse failure from an unexpected
  // schema) must surface immediately, not loop silently.
  return /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(
    message,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err);
      if (!retryable || attempt === attempts) {
        if (retryable) {
          logger.error("jobs.retry_exhausted", {
            label: options?.label,
            attempts,
            message: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      logger.info("jobs.retry_attempt", {
        label: options?.label,
        attempt,
        attempts,
        delayMs: delay,
        message: err instanceof Error ? err.message : String(err),
      });
      await sleep(delay);
    }
  }

  // Unreachable (the loop always returns or throws), but keeps TypeScript
  // happy without an unsafe `as T` at the end.
  throw lastErr;
}

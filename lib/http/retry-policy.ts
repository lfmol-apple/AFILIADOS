/**
 * Shared retry/backoff strategy for future external calls (the live
 * AmazonProvider, any future ContentProvider). Not wired to a live call
 * yet — AmazonProvider is fail-closed and MockAmazonProvider never errors —
 * but the policy exists now so implementing the real integration later
 * doesn't mean inventing retry behavior under time pressure.
 */
export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
};

/** HTTP statuses worth retrying. Everything else (4xx other than 429) is a
 * client/request problem that retrying won't fix. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Exponential backoff with full jitter (delay is randomized between 0 and
 * the exponential cap) — avoids a thundering herd of synchronized retries.
 * `attempt` is 1-indexed (the first retry is attempt 1).
 */
export function computeBackoffDelayMs(
  attempt: number,
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
): number {
  const exponential = config.baseDelayMs * 2 ** (attempt - 1);
  const cap = Math.min(exponential, config.maxDelayMs);
  return Math.floor(random() * cap);
}

export function shouldRetry(
  attempt: number,
  reason: { status?: number; timedOut?: boolean },
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY,
): boolean {
  if (attempt >= config.maxAttempts) return false;
  if (reason.timedOut) return true;
  if (reason.status !== undefined) return isRetryableStatus(reason.status);
  return false;
}

/**
 * Runs `fn`, retrying on retryable failures per `shouldRetry`. `fn` must
 * throw a `RetryableError` (or return normally) — any other thrown error is
 * treated as non-retryable and propagates immediately.
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly reason: { status?: number; timedOut?: boolean },
  ) {
    super(message);
  }
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryPolicyConfig = DEFAULT_RETRY_POLICY,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (err instanceof RetryableError && shouldRetry(attempt, err.reason, config)) {
        await sleep(computeBackoffDelayMs(attempt, config));
        continue;
      }
      throw err;
    }
  }
}

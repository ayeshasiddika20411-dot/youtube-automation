// ============================================================
// Retry / exponential backoff utility
// ============================================================

export interface RetryOptions {
  /** Max number of attempts (default 3) */
  attempts?: number;
  /** Base delay in ms (default 1000) */
  baseDelayMs?: number;
  /** Max delay in ms (default 30000) */
  maxDelayMs?: number;
  /** Factor to multiply delay by each retry (default 2) */
  factor?: number;
  /** Optional function to determine if a retry should be attempted */
  shouldRetry?: (error: unknown) => boolean;
  /** Optional onRetry callback */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  attempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  factor: 2,
  shouldRetry: () => true,
};

/** Compute exponential backoff delay with jitter */
export function computeBackoff(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
  factor = 2
): number {
  const exponential = baseDelayMs * Math.pow(factor, attempt - 1);
  const jitter = Math.random() * 0.5 + 0.75; // 75%–125%
  return Math.min(exponential * jitter, maxDelayMs);
}

/** Sleep helper */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 * Returns the result of fn, or throws the last error after exhausting attempts.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= opts.attempts) break;
      if (!opts.shouldRetry(err)) break;

      const delay = computeBackoff(
        attempt,
        opts.baseDelayMs,
        opts.maxDelayMs,
        opts.factor
      );
      opts.onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/** Retry a function exactly N times, rethrowing on the final failure */
export async function retryNTimes<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  return withRetry(fn, { attempts });
}

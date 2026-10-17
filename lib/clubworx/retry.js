const RETRY_BASE_MS = 1500;
const RETRY_MAX_MS = 60000;
const RATE_LIMIT_BASE_MS = 5000;

/**
 * @param {string|null|undefined} retryAfter
 * @returns {number|null}
 */
export function parseRetryAfterMs(retryAfter) {
  if (!retryAfter) return null;
  const raw = retryAfter.trim();
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, at - Date.now());
}

/**
 * @param {number} attempt zero-based
 * @param {string|null|undefined} retryAfter
 * @param {{ status?: number }} [options]
 * @returns {number}
 */
export function clubWorxRetryDelayMs(attempt, retryAfter, options = {}) {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader != null) {
    return Math.min(Math.max(fromHeader, 250), RETRY_MAX_MS);
  }
  const base = options.status === 429 ? RATE_LIMIT_BASE_MS : RETRY_BASE_MS;
  const backoff = base * 2 ** attempt;
  return Math.min(backoff, RETRY_MAX_MS);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isClubWorxRateLimitError(error) {
  if (!(error instanceof Error)) return false;
  return /\(429\)/.test(error.message) || /too many requests/i.test(error.message);
}

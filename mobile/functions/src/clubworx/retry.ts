const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 15000;

export function parseRetryAfterMs(retryAfter: string | null | undefined): number | null {
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

export function clubWorxRetryDelayMs(
  attempt: number,
  retryAfter: string | null | undefined
): number {
  const fromHeader = parseRetryAfterMs(retryAfter);
  if (fromHeader != null) {
    return Math.min(Math.max(fromHeader, 250), RETRY_MAX_MS);
  }
  const backoff = RETRY_BASE_MS * 2 ** attempt;
  return Math.min(backoff, RETRY_MAX_MS);
}

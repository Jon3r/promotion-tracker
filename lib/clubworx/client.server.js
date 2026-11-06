import "server-only";
import { clubWorxRetryDelayMs } from "./retry";
import { extractClubWorxCollection } from "./collection";

const BASE_URL = "https://app.clubworx.com/api/v2";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 4;
const RATE_LIMIT_MAX_RETRIES = 8;
const PAGE_REQUEST_DELAY_MS = 500;

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function fetchClubWorxWithRetry(input, init) {
  const rawMaxRetries = Number(process.env.CLUBWORX_MAX_RETRIES);
  const defaultMaxRetries =
    Number.isFinite(rawMaxRetries) && rawMaxRetries >= 0
      ? Math.floor(rawMaxRetries)
      : DEFAULT_MAX_RETRIES;
  
  let lastNetworkError = null;
  let lastStatusCode = null;
  let maxRetries = defaultMaxRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let res;
    try {
      res = await fetch(input, init);
    } catch (error) {
      lastNetworkError = error;
      if (attempt === maxRetries) {
        break;
      }
      await sleep(clubWorxRetryDelayMs(attempt, null, null));
      continue;
    }

    lastStatusCode = res.status;
    
    if (res.status === 429 && maxRetries < RATE_LIMIT_MAX_RETRIES) {
      maxRetries = RATE_LIMIT_MAX_RETRIES;
    }

    if (!RETRYABLE_STATUSES.has(res.status) || attempt === maxRetries) {
      return res;
    }

    const delay = clubWorxRetryDelayMs(attempt, res.headers.get("retry-after"), res.status);
    await sleep(delay);
  }

  if (lastStatusCode === 429) {
    throw new Error(
      `ClubWorx rate limit exceeded after ${maxRetries + 1} attempts. The sync is requesting data too frequently. Please try again in a few minutes.`
    );
  }

  const message =
    lastNetworkError instanceof Error
      ? lastNetworkError.message
      : "Unknown network error";
  throw new Error(`ClubWorx request failed after retries: ${message}`);
}

/**
 * @returns {string|null}
 */
export function getClubWorxAccountKey() {
  return process.env.CLUBWORX_ACCOUNT_KEY?.trim() || null;
}

export function isClubWorxConfigured() {
  return Boolean(getClubWorxAccountKey());
}

/**
 * @param {string} endpoint e.g. "member_styles"
 * @param {Record<string, string>} [extraParams]
 */
export async function fetchAllClubWorxPages(endpoint, extraParams = {}) {
  const accountKey = getClubWorxAccountKey();
  if (!accountKey) {
    throw new Error("CLUBWORX_ACCOUNT_KEY is not configured");
  }

  const pageSize = Number(process.env.CLUBWORX_PAGE_SIZE) || 50;
  const pageDelayMs = Number(process.env.CLUBWORX_PAGE_DELAY_MS);
  const delayBetweenPages = Number.isFinite(pageDelayMs) && pageDelayMs >= 0 
    ? pageDelayMs 
    : PAGE_REQUEST_DELAY_MS;
  
  const results = [];
  let page = 1;
  const maxPages = 200;

  while (page <= maxPages) {
    if (page > 1 && delayBetweenPages > 0) {
      await sleep(delayBetweenPages);
    }

    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set("account_key", accountKey);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }

    const res = await fetchClubWorxWithRetry(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const errorMsg = res.status === 429 
        ? `ClubWorx ${endpoint} rate limit exceeded (${res.status}). Try enabling incremental sync or reducing page size. ${text.slice(0, 200)}`
        : `ClubWorx ${endpoint} request failed (${res.status}): ${text.slice(0, 200)}`;
      throw new Error(errorMsg);
    }

    const payload = await res.json();
    const batch = extractClubWorxCollection(payload, endpoint);
    if (!batch) {
      throw new Error(
        `ClubWorx ${endpoint} returned an unsupported response format`
      );
    }
    if (batch.length === 0) break;

    results.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }

  return results;
}

/**
 * Update belt_size on a member_style record.
 * ClubWorx v2 may return 404 for PUT — callers should surface a clear error.
 * @param {number|string} memberStyleId
 * @param {string} beltSize
 */
export async function updateMemberStyleBeltSize(memberStyleId, beltSize) {
  const accountKey = getClubWorxAccountKey();
  if (!accountKey) {
    throw new Error("CLUBWORX_ACCOUNT_KEY is not configured");
  }

  const id = String(memberStyleId);
  const body = new URLSearchParams({ belt_size: beltSize }).toString();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const url = `${BASE_URL}/member_styles/${id}?account_key=${encodeURIComponent(accountKey)}`;

  for (const method of ["PUT", "PATCH"]) {
    const res = await fetchClubWorxWithRetry(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    if (res.ok) {
      try {
        return await res.json();
      } catch {
        return { ok: true };
      }
    }
    if (res.status !== 404 && res.status !== 405) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `ClubWorx member_styles update failed (${res.status}): ${text.slice(0, 200)}`
      );
    }
  }

  throw new Error(
    "ClubWorx API does not support updating belt size on member styles (PUT/PATCH returned 404). Update belt size in ClubWorx directly or contact ClubWorx support to enable this endpoint."
  );
}

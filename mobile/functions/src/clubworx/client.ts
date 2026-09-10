import { extractClubWorxCollection } from "./collection";
import { clubWorxRetryDelayMs } from "./retry";

const BASE_URL = "https://app.clubworx.com/api/v2";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getClubWorxAccountKey(): string | null {
  return process.env.CLUBWORX_ACCOUNT_KEY?.trim() || null;
}

export function isClubWorxConfigured(): boolean {
  return Boolean(getClubWorxAccountKey()) && process.env.USE_MOCK_CLUBWORX !== "1";
}

async function fetchClubWorxWithRetry(input: string, init: RequestInit): Promise<Response> {
  const rawMaxRetries = Number(process.env.CLUBWORX_MAX_RETRIES);
  const maxRetries =
    Number.isFinite(rawMaxRetries) && rawMaxRetries >= 0
      ? Math.floor(rawMaxRetries)
      : DEFAULT_MAX_RETRIES;
  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(input, init);
    } catch (error) {
      lastNetworkError = error;
      if (attempt === maxRetries) break;
      await sleep(clubWorxRetryDelayMs(attempt, null));
      continue;
    }

    if (!RETRYABLE_STATUSES.has(res.status) || attempt === maxRetries) {
      return res;
    }

    const delay = clubWorxRetryDelayMs(attempt, res.headers.get("retry-after"));
    await sleep(delay);
  }

  const message =
    lastNetworkError instanceof Error ? lastNetworkError.message : "Unknown network error";
  throw new Error(`ClubWorx request failed after retries: ${message}`);
}

export async function fetchAllClubWorxPages(
  endpoint: string,
  extraParams: Record<string, string> = {}
): Promise<Record<string, unknown>[]> {
  const accountKey = getClubWorxAccountKey();
  if (!accountKey) {
    throw new Error("CLUBWORX_ACCOUNT_KEY is not configured");
  }

  const pageSize = Number(process.env.CLUBWORX_PAGE_SIZE) || 50;
  const results: Record<string, unknown>[] = [];
  let page = 1;
  const maxPages = 200;

  while (page <= maxPages) {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.set("account_key", accountKey);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }

    const res = await fetchClubWorxWithRetry(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `ClubWorx ${endpoint} request failed (${res.status}): ${text.slice(0, 200)}`
      );
    }

    const payload = await res.json();
    const batch = extractClubWorxCollection(payload, endpoint);
    if (!batch) {
      throw new Error(`ClubWorx ${endpoint} returned an unsupported response format`);
    }
    if (batch.length === 0) break;

    results.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }

  return results;
}

export async function fetchClubWorxPagesWithParamCandidates(
  endpoint: string,
  candidates: Record<string, string>[]
): Promise<{ ok: true; rows: Record<string, unknown>[] } | { ok: false; errors: string[] }> {
  const errors: string[] = [];
  for (const params of candidates) {
    try {
      const rows = await fetchAllClubWorxPages(endpoint, params);
      return { ok: true, rows };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown ClubWorx error");
    }
  }
  return { ok: false, errors };
}

export async function updateMemberStyleForm(
  memberStyleId: number | string,
  fields: Record<string, string>
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; message: string }> {
  const accountKey = getClubWorxAccountKey();
  if (!accountKey) {
    throw new Error("CLUBWORX_ACCOUNT_KEY is not configured");
  }

  const id = String(memberStyleId);
  const body = new URLSearchParams(fields).toString();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const url = `${BASE_URL}/member_styles/${id}?account_key=${encodeURIComponent(accountKey)}`;

  for (const method of ["PUT", "PATCH"] as const) {
    const res = await fetchClubWorxWithRetry(url, { method, headers, body });
    if (res.ok) {
      try {
        return { ok: true, body: await res.json() };
      } catch {
        return { ok: true, body: { ok: true } };
      }
    }
    if (res.status !== 404 && res.status !== 405) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        message: `ClubWorx member_styles update failed (${res.status}): ${text.slice(0, 200)}`,
      };
    }
  }

  return {
    ok: false,
    status: 404,
    message:
      "ClubWorx API does not support updating rank on member styles (PUT/PATCH returned 404).",
  };
}

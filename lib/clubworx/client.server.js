import "server-only";

const BASE_URL = "https://app.clubworx.com/api/v2";

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
  const results = [];
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

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `ClubWorx ${endpoint} request failed (${res.status}): ${text.slice(0, 200)}`
      );
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

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
    const res = await fetch(url, { method, headers, body, cache: "no-store" });
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

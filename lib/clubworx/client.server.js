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

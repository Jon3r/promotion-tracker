"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClubWorxAccountKey = getClubWorxAccountKey;
exports.isClubWorxConfigured = isClubWorxConfigured;
exports.fetchAllClubWorxPages = fetchAllClubWorxPages;
exports.fetchClubWorxPagesWithParamCandidates = fetchClubWorxPagesWithParamCandidates;
exports.updateMemberStyleForm = updateMemberStyleForm;
const collection_1 = require("./collection");
const retry_1 = require("./retry");
const BASE_URL = "https://app.clubworx.com/api/v2";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_REQUEST_GAP_MS = 350;
/** Serialize ClubWorx HTTP calls so pagination + parallel endpoints do not stampede the API. */
let clubWorxQueue = Promise.resolve();
let lastClubWorxRequestAt = 0;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function requestGapMs() {
    const raw = Number(process.env.CLUBWORX_REQUEST_GAP_MS);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULT_REQUEST_GAP_MS;
}
function enqueueClubWorxRequest(fn) {
    const run = clubWorxQueue.then(async () => {
        const wait = Math.max(0, requestGapMs() - (Date.now() - lastClubWorxRequestAt));
        if (wait > 0)
            await sleep(wait);
        lastClubWorxRequestAt = Date.now();
        return fn();
    });
    clubWorxQueue = run.then(() => undefined, () => undefined);
    return run;
}
function getClubWorxAccountKey() {
    return process.env.CLUBWORX_ACCOUNT_KEY?.trim() || null;
}
function isClubWorxConfigured() {
    return Boolean(getClubWorxAccountKey()) && process.env.USE_MOCK_CLUBWORX !== "1";
}
async function fetchClubWorxWithRetry(input, init) {
    const rawMaxRetries = Number(process.env.CLUBWORX_MAX_RETRIES);
    const maxRetries = Number.isFinite(rawMaxRetries) && rawMaxRetries >= 0
        ? Math.floor(rawMaxRetries)
        : DEFAULT_MAX_RETRIES;
    let lastNetworkError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        let res;
        try {
            res = await enqueueClubWorxRequest(() => fetch(input, init));
        }
        catch (error) {
            lastNetworkError = error;
            if (attempt === maxRetries)
                break;
            await sleep((0, retry_1.clubWorxRetryDelayMs)(attempt, null));
            continue;
        }
        if (!RETRYABLE_STATUSES.has(res.status) || attempt === maxRetries) {
            return res;
        }
        const delay = (0, retry_1.clubWorxRetryDelayMs)(attempt, res.headers.get("retry-after"));
        await sleep(delay);
    }
    const message = lastNetworkError instanceof Error ? lastNetworkError.message : "Unknown network error";
    throw new Error(`ClubWorx request failed after retries: ${message}`);
}
async function fetchAllClubWorxPages(endpoint, extraParams = {}) {
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
        const res = await fetchClubWorxWithRetry(url.toString(), {
            headers: { Accept: "application/json" },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`ClubWorx ${endpoint} request failed (${res.status}): ${text.slice(0, 200)}`);
        }
        const payload = await res.json();
        const batch = (0, collection_1.extractClubWorxCollection)(payload, endpoint);
        if (!batch) {
            throw new Error(`ClubWorx ${endpoint} returned an unsupported response format`);
        }
        if (batch.length === 0)
            break;
        results.push(...batch);
        if (batch.length < pageSize)
            break;
        page += 1;
    }
    return results;
}
async function fetchClubWorxPagesWithParamCandidates(endpoint, candidates) {
    const errors = [];
    for (const params of candidates) {
        try {
            const rows = await fetchAllClubWorxPages(endpoint, params);
            return { ok: true, rows };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : "Unknown ClubWorx error");
        }
    }
    return { ok: false, errors };
}
async function updateMemberStyleForm(memberStyleId, fields) {
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
    for (const method of ["PUT", "PATCH"]) {
        const res = await fetchClubWorxWithRetry(url, { method, headers, body });
        if (res.ok) {
            try {
                return { ok: true, body: await res.json() };
            }
            catch {
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
        message: "ClubWorx API does not support updating rank on member styles (PUT/PATCH returned 404).",
    };
}
//# sourceMappingURL=client.js.map
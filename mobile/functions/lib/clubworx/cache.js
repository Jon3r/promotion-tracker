"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envTtlMs = envTtlMs;
exports.cached = cached;
exports.invalidateCache = invalidateCache;
const entries = new Map();
function envTtlMs(name, fallbackMs) {
    const raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallbackMs;
}
/**
 * Per-instance TTL cache. Concurrent callers share one in-flight load; failed
 * loads are not cached.
 */
async function cached(key, ttlMs, load, now = Date.now) {
    const entry = entries.get(key);
    if (entry) {
        if ("pending" in entry)
            return entry.pending;
        if (entry.expiresAt > now())
            return entry.value;
    }
    const pending = load();
    entries.set(key, { pending });
    try {
        const value = await pending;
        entries.set(key, { value, expiresAt: now() + ttlMs });
        return value;
    }
    catch (error) {
        entries.delete(key);
        throw error;
    }
}
function invalidateCache(prefix) {
    for (const key of entries.keys()) {
        if (key.startsWith(prefix))
            entries.delete(key);
    }
}
//# sourceMappingURL=cache.js.map
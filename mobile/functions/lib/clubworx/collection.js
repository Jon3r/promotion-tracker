"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClubWorxCollection = extractClubWorxCollection;
/**
 * ClubWorx endpoints are usually arrays, but some accounts return
 * wrapped objects with arrays under data/results/items keys.
 */
function extractClubWorxCollection(payload, endpoint) {
    if (Array.isArray(payload))
        return payload;
    if (!payload || typeof payload !== "object")
        return null;
    const obj = payload;
    const singular = endpoint.endsWith("s") ? endpoint.slice(0, -1) : endpoint;
    const candidates = [
        endpoint,
        singular,
        "data",
        "results",
        "items",
        `${endpoint}_items`,
        `${singular}_items`,
    ];
    for (const key of candidates) {
        const value = obj[key];
        if (Array.isArray(value)) {
            return value;
        }
    }
    const arrays = Object.values(obj).filter(Array.isArray);
    if (arrays.length === 1) {
        return arrays[0];
    }
    return null;
}
//# sourceMappingURL=collection.js.map
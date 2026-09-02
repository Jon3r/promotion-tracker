/**
 * ClubWorx endpoints are usually arrays, but some accounts/endpoints return
 * wrapped objects with arrays under data/results/items keys.
 * @param {unknown} payload
 * @param {string} endpoint
 * @returns {Record<string, unknown>[]|null}
 */
export function extractClubWorxCollection(payload, endpoint) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  const obj = /** @type {Record<string, unknown>} */ (payload);
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
      return /** @type {Record<string, unknown>[]} */ (value);
    }
  }

  const arrays = Object.values(obj).filter(Array.isArray);
  if (arrays.length === 1) {
    return /** @type {Record<string, unknown>[]} */ (arrays[0]);
  }

  return null;
}


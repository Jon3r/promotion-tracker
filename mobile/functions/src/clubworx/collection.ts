/**
 * ClubWorx endpoints are usually arrays, but some accounts return
 * wrapped objects with arrays under data/results/items keys.
 */
export function extractClubWorxCollection(
  payload: unknown,
  endpoint: string
): Record<string, unknown>[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
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
      return value as Record<string, unknown>[];
    }
  }

  const arrays = Object.values(obj).filter(Array.isArray);
  if (arrays.length === 1) {
    return arrays[0] as Record<string, unknown>[];
  }

  return null;
}

const ADULT_PRESETS = ["A0", "A1", "A2", "A3", "A4", "A5", "M0", "M1", "M2", "M3", "M4"];
const KIDS_PRESETS = ["M00", "M0", "M1", "M2", "M3", "M4", "000", "00", "0", "1", "2", "3", "4"];
const CUSTOM_VALUE = "__custom__";

const STORAGE_KEY = "promotion-tracker-custom-gi-sizes";

/**
 * @param {'adults'|'kids'} category
 * @returns {string[]}
 */
export function baseGiSizePresets(category) {
  return category === "kids" ? [...KIDS_PRESETS] : [...ADULT_PRESETS];
}

/**
 * @returns {string[]}
 */
export function loadCustomGiSizes() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string" && s.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} sizes
 */
export function saveCustomGiSizes(sizes) {
  if (typeof localStorage === "undefined") return;
  const unique = [...new Set(sizes.map((s) => s.trim()).filter(Boolean))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

/**
 * @param {'adults'|'kids'} category
 * @param {string[]} [customSizes]
 */
export function giSizeOptionsForCategory(category, customSizes = []) {
  const base = baseGiSizePresets(category);
  const merged = [...new Set([...base, ...customSizes])];
  merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return merged;
}

/**
 * @param {string} value
 * @param {'adults'|'kids'} category
 * @param {string[]} customSizes
 */
export function normalizeGiSizeValue(value, category, customSizes = []) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === CUSTOM_VALUE) return "";
  const presets = giSizeOptionsForCategory(category, customSizes);
  if (presets.includes(trimmed)) return trimmed;
  return trimmed;
}

export { CUSTOM_VALUE };

/**
 * Gi size sort index for belt order exports (unknown last).
 * @param {string} size
 * @param {'adults'|'kids'} category
 */
export function giSizeSortIndex(size, category) {
  const normalized = String(size || "").trim();
  if (!normalized) return 9999;
  const presets = giSizeOptionsForCategory(category);
  const idx = presets.findIndex(
    (p) => p.toLowerCase() === normalized.toLowerCase()
  );
  return idx === -1 ? 5000 + normalized.charCodeAt(0) : idx;
}

const ADULT_PRESETS = ["A0", "A1", "A2", "A3", "A4", "A5", "M0", "M1", "M2", "M3", "M4"];
const KIDS_PRESETS = ["M00", "M0", "M1", "M2", "M3", "M4", "000", "00", "0", "1", "2", "3", "4"];
/**
 * @param {'adults'|'kids'} category
 * @returns {string[]}
 */
export function baseGiSizePresets(category) {
  return category === "kids" ? [...KIDS_PRESETS] : [...ADULT_PRESETS];
}

/**
 * @param {'adults'|'kids'} category
 * @param {string[]} [extraSizes]
 */
export function giSizeOptionsForCategory(category, extraSizes = []) {
  const base = baseGiSizePresets(category);
  const merged = [...new Set([...base, ...extraSizes])];
  merged.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return merged;
}

/**
 * Merge API/roster sizes with presets and any values already on students.
 * @param {'adults'|'kids'} category
 * @param {string[]} fetchedSizes
 * @param {import('./parseExcel').Student[]} [students]
 */
export function buildGiSizeOptions(category, fetchedSizes = [], students = []) {
  const fromStudents = students
    .map((s) => String(s.beltSize || "").trim())
    .filter(Boolean);
  return giSizeOptionsForCategory(category, [...fetchedSizes, ...fromStudents]);
}

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

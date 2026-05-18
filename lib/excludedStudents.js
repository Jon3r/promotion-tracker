import { studentDedupeKey } from "./deduplicate";

const STORAGE_KEY = "promotion-tracker-excluded";

/**
 * @param {'adults'|'kids'} category
 * @param {import('./parseExcel').Student} student
 */
export function exclusionKey(category, student) {
  return `${category}:${studentDedupeKey(student)}`;
}

/**
 * @returns {{ adults: string[], kids: string[] }}
 */
export function loadExcludedKeys() {
  if (typeof localStorage === "undefined") {
    return { adults: [], kids: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { adults: [], kids: [] };
    const data = JSON.parse(raw);
    return {
      adults: Array.isArray(data.adults) ? data.adults : [],
      kids: Array.isArray(data.kids) ? data.kids : [],
    };
  } catch {
    return { adults: [], kids: [] };
  }
}

/**
 * @param {{ adults: string[], kids: string[] }} excluded
 */
export function saveExcludedKeys(excluded) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(excluded));
  } catch (e) {
    console.warn("Could not save excluded students:", e);
  }
}

export function clearExcludedKeys() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 * @param {string[]} excludedList
 */
export function withoutExcluded(students, category, excludedList) {
  if (!excludedList.length) return students;
  const hidden = new Set(excludedList);
  return students.filter((s) => !hidden.has(exclusionKey(category, s)));
}

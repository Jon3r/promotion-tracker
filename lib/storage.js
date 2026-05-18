import {
  serializeStudent,
  deserializeStudent,
  serializeDataset,
} from "./datasetSerialize";

const KEYS = {
  adults: "promotion-tracker-adults",
  kids: "promotion-tracker-kids",
};

/**
 * @param {'adults'|'kids'} category
 * @param {{ students: import('./parseExcel').Student[], fileName: string|null, error: string|null }} dataset
 */
export function saveDataset(category, dataset) {
  if (typeof localStorage === "undefined") return;

  try {
    const payload = serializeDataset({
      students: dataset.students,
      fileName: dataset.fileName,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(KEYS[category], JSON.stringify(payload));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

/**
 * @param {'adults'|'kids'} category
 */
export function loadDataset(category) {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEYS[category]);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.students)) {
      localStorage.removeItem(KEYS[category]);
      return null;
    }

    return {
      fileName: data.fileName ?? null,
      error: null,
      savedAt: data.savedAt,
      students: data.students.map(deserializeStudent),
    };
  } catch {
    localStorage.removeItem(KEYS[category]);
    return null;
  }
}

/**
 * @param {'adults'|'kids'} category
 */
export function clearSavedDataset(category) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEYS[category]);
}

export function clearAllSavedData() {
  clearSavedDataset("adults");
  clearSavedDataset("kids");
}

export { serializeStudent, serializeDataset };

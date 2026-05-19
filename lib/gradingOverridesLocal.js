const STORAGE_KEY = "promotion-tracker-grading-overrides";

/**
 * @returns {{ adults: Record<string, string>, kids: Record<string, string> }}
 */
export function loadLocalGradingOverrides() {
  if (typeof localStorage === "undefined") {
    return { adults: {}, kids: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { adults: {}, kids: {} };
    const parsed = JSON.parse(raw);
    return {
      adults:
        parsed?.adults && typeof parsed.adults === "object" ? parsed.adults : {},
      kids: parsed?.kids && typeof parsed.kids === "object" ? parsed.kids : {},
    };
  } catch {
    return { adults: {}, kids: {} };
  }
}

/**
 * @param {{ adults: Record<string, string>, kids: Record<string, string> }} overrides
 */
export function saveLocalGradingOverrides(overrides) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/**
 * @param {'adults'|'kids'} category
 * @param {string} contactKey
 * @param {string} gradingBelt empty string clears override
 */
export function patchLocalGradingOverride(category, contactKey, gradingBelt) {
  const all = loadLocalGradingOverrides();
  const bucket = { ...all[category] };
  if (!gradingBelt) {
    delete bucket[contactKey];
  } else {
    bucket[contactKey] = gradingBelt;
  }
  const next = { ...all, [category]: bucket };
  saveLocalGradingOverrides(next);
  return next;
}

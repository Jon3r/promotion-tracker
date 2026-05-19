const STORAGE_KEY = "promotion-tracker-gi-size-overrides";

/**
 * @returns {{ adults: Record<string, string>, kids: Record<string, string> }}
 */
export function loadLocalGiSizeOverrides() {
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
 * @param {'adults'|'kids'} category
 * @param {string} contactKey
 * @param {string} giSize
 */
export function patchLocalGiSizeOverride(category, contactKey, giSize) {
  const all = loadLocalGiSizeOverrides();
  const bucket = { ...all[category] };
  if (!giSize) {
    delete bucket[contactKey];
  } else {
    bucket[contactKey] = giSize;
  }
  const next = { ...all, [category]: bucket };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

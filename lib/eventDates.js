import { formatDate, parseDate } from "./dates";

const STORAGE_KEY = "promotion-tracker-event-dates";

/**
 * @typedef {{ gradingDate: string, ceremonyDate: string }} CategoryEventDates
 * @typedef {{ adults: CategoryEventDates, kids: CategoryEventDates }} EventDates
 */

/** @returns {EventDates} */
export function defaultEventDates() {
  return {
    adults: { gradingDate: "", ceremonyDate: "" },
    kids: { gradingDate: "", ceremonyDate: "" },
  };
}

/** @returns {EventDates} */
export function loadEventDates() {
  if (typeof localStorage === "undefined") return defaultEventDates();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultEventDates();
    const parsed = JSON.parse(raw);
    return {
      adults: {
        gradingDate: String(parsed?.adults?.gradingDate || ""),
        ceremonyDate: String(parsed?.adults?.ceremonyDate || ""),
      },
      kids: {
        gradingDate: String(parsed?.kids?.gradingDate || ""),
        ceremonyDate: String(parsed?.kids?.ceremonyDate || ""),
      },
    };
  } catch {
    return defaultEventDates();
  }
}

/** @param {EventDates} dates */
export function saveEventDates(dates) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
}

/**
 * @param {string} isoDate YYYY-MM-DD from &lt;input type="date"&gt;
 * @returns {string|null}
 */
export function formatEventDateForPdf(isoDate) {
  const trimmed = String(isoDate || "").trim();
  if (!trimmed) return null;
  const d = parseDate(trimmed);
  return d ? formatDate(d) : trimmed;
}

/**
 * @param {EventDates} dates
 * @param {'adults'|'kids'} category
 */
export function eventDatesForCategory(dates, category) {
  const cat = category === "kids" ? "kids" : "adults";
  return dates[cat] || { gradingDate: "", ceremonyDate: "" };
}

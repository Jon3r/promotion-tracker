/**
 * Parse a date from Excel export (ISO or AU format).
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  // ISO: 2025-11-22 or 2025-11-22T00:00:00
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // AU: DD/MM/YYYY
  const au = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (au) {
    const d = new Date(Number(au[3]), Number(au[2]) - 1, Number(au[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * @param {Date|null} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * @param {Date|null} date
 * @returns {number|null} timestamp for sorting
 */
export function dateSortKey(date) {
  return date ? date.getTime() : null;
}

/**
 * Days from today until date (negative = past).
 * @param {Date|null} date
 * @returns {number|null}
 */
export function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

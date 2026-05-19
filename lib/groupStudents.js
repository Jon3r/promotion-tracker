import { dateSortKey } from "./dates";
import { beltSortIndex } from "./rank";
import { effectiveGradingBelt } from "./gradingBelt";

/**
 * @param {import('./parseExcel').Student} student
 * @param {{ groupByNext?: boolean, groupByGrading?: boolean }} [options]
 */
function beltKeyForStudent(student, category, options = {}) {
  if (options.groupByGrading) return effectiveGradingBelt(student, category);
  return options.groupByNext
    ? student.nextParsed.belt
    : student.currentParsed.belt;
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 * @param {'date'|'name'} sortBy
 * @param {{ groupByNext?: boolean, groupByGrading?: boolean }} [options] groupByGrading uses effective grading belt (override or next).
 * @returns {Map<string, import('./parseExcel').Student[]>}
 */
export function groupByBelt(students, category, sortBy = "date", options = {}) {
  const groups = new Map();

  for (const student of students) {
    const belt = beltKeyForStudent(student, category, options);
    if (!groups.has(belt)) groups.set(belt, []);
    groups.get(belt).push(student);
  }

  for (const [, list] of groups) {
    list.sort((a, b) => compareStudents(a, b, sortBy));
  }

  const sortedEntries = [...groups.entries()].sort(
    ([beltA], [beltB]) =>
      beltSortIndex(beltA, category) - beltSortIndex(beltB, category)
  );

  return new Map(sortedEntries);
}

/**
 * @param {import('./parseExcel').Student} a
 * @param {import('./parseExcel').Student} b
 * @param {'date'|'name'} sortBy
 */
function compareStudents(a, b, sortBy) {
  if (sortBy === "name") {
    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
  }

  const da = dateSortKey(a.promotionDate);
  const db = dateSortKey(b.promotionDate);
  if (da == null && db == null) return a.fullName.localeCompare(b.fullName);
  if (da == null) return 1;
  if (db == null) return -1;
  if (da !== db) return da - db;
  return a.fullName.localeCompare(b.fullName);
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {string} query
 */
export function filterBySearch(students, query) {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.currentRank.toLowerCase().includes(q) ||
      s.nextRank.toLowerCase().includes(q)
  );
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {string} beltFilter belt key or "all"
 */
export function filterByBelt(students, beltFilter) {
  if (!beltFilter || beltFilter === "all") return students;
  return students.filter((s) => s.currentParsed.belt === beltFilter);
}

/**
 * Belts present in roster, in display order.
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 */
export function beltFilterOptions(students, category) {
  const belts = new Set();
  for (const s of students) {
    belts.add(s.currentParsed.belt);
  }
  return [...belts].sort(
    (a, b) => beltSortIndex(a, category) - beltSortIndex(b, category)
  );
}

/**
 * @param {string|string[]|undefined} stripeFilters
 * @returns {string[]}
 */
export function normalizeStripeFilters(stripeFilters) {
  if (!stripeFilters || stripeFilters === "all") return [];
  if (Array.isArray(stripeFilters)) {
    return stripeFilters.filter((v) => v && v !== "all");
  }
  return [stripeFilters];
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {string|string[]} stripeFilters empty / "all" = no filter; else "none", "1", "2", ...
 */
export function filterByStripe(students, stripeFilters) {
  const selected = normalizeStripeFilters(stripeFilters);
  if (selected.length === 0) return students;

  return students.filter((s) => {
    const stripes = s.currentParsed.stripes;
    if (stripes == null) return selected.includes("none");
    return selected.includes(String(stripes));
  });
}

/**
 * Stripe counts present in a roster (for filter dropdown).
 * @param {import('./parseExcel').Student[]} students
 */
export function stripeFilterOptions(students) {
  const stripes = new Set();
  let hasUnspecified = false;
  for (const s of students) {
    const n = s.currentParsed.stripes;
    if (n == null) hasUnspecified = true;
    else stripes.add(n);
  }
  return {
    stripes: [...stripes].sort((a, b) => a - b),
    hasUnspecified,
  };
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ search?: string, beltFilter?: string, stripeFilters?: string|string[] }} filters
 */
/**
 * @param {import('./parseExcel').Student[]} students
 * @param {string} beltFilter
 */
export function filterByGradingBeltKey(students, beltFilter, category = "adults") {
  if (!beltFilter || beltFilter === "all") return students;
  return students.filter((s) => effectiveGradingBelt(s, category) === beltFilter);
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 */
export function gradingBeltFilterOptions(students, category) {
  const belts = new Set();
  for (const s of students) {
    belts.add(effectiveGradingBelt(s, category));
  }
  return [...belts].sort(
    (a, b) => beltSortIndex(a, category) - beltSortIndex(b, category)
  );
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ search?: string, beltFilter?: string, stripeFilters?: string|string[], viewMode?: 'current'|'grading' }} filters
 */
export function applyFilters(
  students,
  {
    search = "",
    beltFilter = "all",
    stripeFilters = [],
    viewMode = "current",
    category = "adults",
  } = {}
) {
  let list = filterBySearch(students, search);
  if (viewMode === "grading") {
    list = filterByGradingBeltKey(list, beltFilter, category);
  } else {
    list = filterByBelt(list, beltFilter);
  }
  list = filterByStripe(list, stripeFilters);
  return list;
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 */
export function beltCounts(students, category, viewMode = "current") {
  const groupOptions =
    viewMode === "grading" ? { groupByGrading: true } : {};
  const groups = groupByBelt(students, category, "date", groupOptions);
  return [...groups.entries()].map(([belt, list]) => ({
    belt,
    count: list.length,
    students: list,
  }));
}

/**
 * Nearest upcoming promotion in a belt group.
 * @param {import('./parseExcel').Student[]} students
 */
export function nearestPromotionDate(students) {
  let nearest = null;
  for (const s of students) {
    if (!s.promotionDate) continue;
    if (!nearest || s.promotionDate < nearest) nearest = s.promotionDate;
  }
  return nearest;
}

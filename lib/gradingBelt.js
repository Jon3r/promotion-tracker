import { ADULT_BELT_ORDER, KIDS_BELT_ORDER, beltDisplayName } from "./rank";

/**
 * @param {string} belt
 * @param {'adults'|'kids'} category
 * @returns {string|null}
 */
export function nextBeltInSequence(belt, category) {
  const order = category === "kids" ? KIDS_BELT_ORDER : ADULT_BELT_ORDER;
  const idx = order.indexOf(belt);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/**
 * Next belt colour for grading (ignores stripe promotions on the same colour).
 * @param {import('./parseExcel').Student} student
 * @param {'adults'|'kids'} category
 * @returns {string}
 */
export function nextBeltColor(student, category = "adults") {
  const current = student.currentParsed?.belt;
  const clubNext = student.nextParsed?.belt;

  if (!current || current === "unknown") {
    if (clubNext && clubNext !== "unknown") return clubNext;
    return "unknown";
  }

  if (clubNext && clubNext !== "unknown" && clubNext !== current) {
    return clubNext;
  }

  return nextBeltInSequence(current, category) ?? clubNext ?? current;
}

/** Adults-only: grading belt view, next-colour column, and manual moves. */
export function supportsGradingBeltView(category) {
  return category === "adults";
}

/**
 * Label for the Next column — next colour (adults only); kids use ClubWorx next rank.
 * @param {import('./parseExcel').Student} student
 * @param {'adults'|'kids'} category
 */
export function displayNextRank(student, category = "adults") {
  if (category === "kids") {
    return student.nextRank?.trim() || "—";
  }

  const current = student.currentParsed?.belt;
  const clubNext = student.nextParsed?.belt;
  const colorNext = nextBeltColor(student, category);

  if (current && clubNext === current && colorNext && colorNext !== current) {
    return `${beltDisplayName(colorNext)} Belt`;
  }

  return student.nextRank?.trim() || "—";
}

/**
 * @param {import('./parseExcel').Student} student
 * @param {'adults'|'kids'} [category]
 * @returns {string}
 */
export function defaultGradingBelt(student, category = "adults") {
  return nextBeltColor(student, category);
}

/**
 * @param {import('./parseExcel').Student} student
 * @param {'adults'|'kids'} [category]
 * @returns {string}
 */
export function effectiveGradingBelt(student, category = "adults") {
  if (student.gradingBeltOverride) return student.gradingBeltOverride;
  return defaultGradingBelt(student, category);
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {Record<string, string>} overridesByContactKey contact_key -> grading_belt
 * @returns {import('./parseExcel').Student[]}
 */
export function mergeGradingOverrides(students, overridesByContactKey) {
  if (!overridesByContactKey || !Object.keys(overridesByContactKey).length) {
    return students;
  }
  return students.map((s) => {
    const key = s.contactKey;
    if (!key || !overridesByContactKey[key]) return s;
    return { ...s, gradingBeltOverride: overridesByContactKey[key] };
  });
}

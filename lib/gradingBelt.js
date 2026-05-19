import { ADULT_BELT_ORDER, KIDS_BELT_ORDER } from "./rank";

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
 * @param {import('./parseExcel').Student} student
 * @returns {string}
 */
export function defaultGradingBelt(student) {
  return student.nextParsed?.belt ?? student.currentParsed?.belt ?? "unknown";
}

/**
 * @param {import('./parseExcel').Student} student
 * @returns {string}
 */
export function effectiveGradingBelt(student) {
  if (student.gradingBeltOverride) return student.gradingBeltOverride;
  return defaultGradingBelt(student);
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

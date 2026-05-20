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
 * Solid belt for a kids white/slash entry rank (e.g. greenwhite → green).
 * @param {string} belt
 * @returns {string|null}
 */
export function solidBeltForWhiteVariant(belt) {
  if (!belt.endsWith("white") || belt === "white") return null;
  return belt.slice(0, -"white".length) || null;
}

/**
 * Kids next belt key for grouping — uses ClubWorx next rank, with solid→white variant when that is the next step in the kids sequence.
 * @param {import('./parseExcel').Student} student
 * @returns {string}
 */
export function kidsNextBeltKey(student) {
  const current = student.currentParsed?.belt;
  const next = student.nextParsed?.belt ?? "unknown";
  if (!current || current === "unknown" || next === "unknown") {
    return next;
  }

  const seqNext = nextBeltInSequence(current, "kids");
  if (!seqNext) return next;

  const solid = solidBeltForWhiteVariant(seqNext);
  if (solid && next === solid) return seqNext;

  return next;
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
 * Grouping options for names PDF — adults by next belt colour (incl. overrides); kids by ClubWorx next belt.
 * @param {'adults'|'kids'} category
 * @returns {{ groupByGrading?: boolean, groupByNext?: boolean }}
 */
export function pdfGroupOptions(category) {
  if (category === "adults") {
    return { groupByGrading: true };
  }
  if (category === "kids") {
    return { groupByNext: true };
  }
  return {};
}

/**
 * Label for the Next column — next colour (adults only); kids use ClubWorx next rank.
 * @param {import('./parseExcel').Student} student
 * @param {'adults'|'kids'} category
 */
export function displayNextRank(student, category = "adults") {
  if (category === "kids") {
    const raw = student.nextRank?.trim();
    if (!raw) return "—";
    const key = kidsNextBeltKey(student);
    const parsed = student.nextParsed?.belt;
    if (key !== parsed && key !== "unknown") {
      return `${beltDisplayName(key)} Belt`;
    }
    return raw;
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

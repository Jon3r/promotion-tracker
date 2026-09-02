/**
 * @param {import('./parseExcel').Student} student
 * @returns {boolean}
 */
export function isReadyToPromote(student) {
  if (student?.readyToPromote === true) return true;
  return /ready (to promote|for promotion)/i.test(String(student?.nextRank || ""));
}


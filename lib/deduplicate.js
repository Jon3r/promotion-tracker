/**
 * Build a stable key for duplicate detection.
 * @param {import('./parseExcel').Student} student
 */
export function studentDedupeKey(student) {
  const email = student.email.trim().toLowerCase();
  if (email) return `email:${email}`;

  const phone = student.phone.replace(/\D/g, "");
  const name = student.fullName.trim().toLowerCase().replace(/\s+/g, " ");
  if (name && phone) return `name-phone:${name}|${phone}`;
  if (name) return `name:${name}`;

  return `id:${student.firstName.toLowerCase()}|${student.lastName.toLowerCase()}`;
}

/**
 * Prefer the row with a promotion date, then more recent promotion date.
 * @param {import('./parseExcel').Student} a
 * @param {import('./parseExcel').Student} b
 */
function pickPreferredStudent(a, b) {
  const ta = a.promotionDate?.getTime() ?? 0;
  const tb = b.promotionDate?.getTime() ?? 0;
  if (ta !== tb) return ta >= tb ? a : b;

  const ra = a.mostRecentPromotion?.getTime() ?? 0;
  const rb = b.mostRecentPromotion?.getTime() ?? 0;
  if (ra !== rb) return ra >= rb ? a : b;

  return a;
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @returns {{ students: import('./parseExcel').Student[], duplicatesRemoved: number }}
 */
export function deduplicateStudents(students) {
  const byKey = new Map();

  for (const student of students) {
    const key = studentDedupeKey(student);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, student);
    } else {
      byKey.set(key, pickPreferredStudent(existing, student));
    }
  }

  const unique = [...byKey.values()];
  return {
    students: unique,
    duplicatesRemoved: students.length - unique.length,
  };
}

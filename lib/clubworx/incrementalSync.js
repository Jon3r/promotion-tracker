import { deduplicateStudents } from "../deduplicate";

/**
 * @param {Record<string, unknown>[]} memberStyles
 */
export function collectIncrementalTouchedKeys(memberStyles) {
  const touchedContactKeys = new Set();
  const touchedMemberStyleIds = new Set();

  for (const record of memberStyles) {
    const contactKey = String(record.contact_key || "").trim();
    if (contactKey) touchedContactKeys.add(contactKey);

    const rawId = record.id != null ? Number(record.id) : null;
    if (Number.isFinite(rawId)) touchedMemberStyleIds.add(rawId);
  }

  return {
    touchedContactKeys,
    touchedMemberStyleIds,
  };
}

/**
 * Replace touched students with incremental updates while keeping untouched rows.
 * @param {import('../parseExcel').Student[]} existingStudents
 * @param {import('../parseExcel').Student[]} incrementalStudents
 * @param {Set<string>} touchedContactKeys
 * @param {Set<number>} touchedMemberStyleIds
 */
export function mergeIncrementalStudents(
  existingStudents,
  incrementalStudents,
  touchedContactKeys,
  touchedMemberStyleIds
) {
  const kept = existingStudents.filter((student) => {
    const contactKey = String(student.contactKey || "").trim();
    if (contactKey && touchedContactKeys.has(contactKey)) {
      return false;
    }
    const memberStyleId =
      student.memberStyleId != null ? Number(student.memberStyleId) : null;
    if (
      Number.isFinite(memberStyleId) &&
      touchedMemberStyleIds.has(memberStyleId)
    ) {
      return false;
    }
    return true;
  });

  const { students } = deduplicateStudents([...kept, ...incrementalStudents]);
  return students;
}


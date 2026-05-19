/**
 * Apply saved Gi size overrides (survives ClubWorx sync).
 * @param {import('./parseExcel').Student[]} students
 * @param {Record<string, string>} overridesByContactKey
 */
export function applyGiSizeOverrides(students, overridesByContactKey) {
  if (!overridesByContactKey || !Object.keys(overridesByContactKey).length) {
    return students;
  }
  return students.map((s) => {
    const key = s.contactKey;
    if (!key || overridesByContactKey[key] == null) return s;
    return { ...s, beltSize: overridesByContactKey[key] };
  });
}

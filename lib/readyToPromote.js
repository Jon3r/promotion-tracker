/**
 * @param {import('./parseExcel').Student} student
 * @returns {boolean}
 */
export function isReadyToPromote(student) {
  if (student?.readyToPromote === true) return true;
  if (/ready (to promote|for promotion)/i.test(String(student?.nextRank || ""))) {
    return true;
  }

  const current = student?.currentParsed;
  const next = student?.nextParsed;
  if (!current || !next) return false;

  const currentBelt = current.belt || "unknown";
  const nextBelt = next.belt || "unknown";
  if (currentBelt === "unknown" || nextBelt === "unknown") return false;

  // Profile-based fallback: if ClubWorx next rank advances belt or stripes,
  // treat the member as ready to promote for reporting and badge display.
  if (nextBelt !== currentBelt) return true;

  const currentStripes =
    typeof current.stripes === "number" ? current.stripes : null;
  const nextStripes = typeof next.stripes === "number" ? next.stripes : null;
  if (currentStripes == null || nextStripes == null) return false;

  return nextStripes > currentStripes;
}


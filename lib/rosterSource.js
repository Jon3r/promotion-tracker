/** Label written to roster fileName when data comes from ClubWorx sync. */
export const CLUBWORX_ROSTER_PREFIX = "ClubWorx";

/**
 * @param {string|null|undefined} fileName
 */
export function isClubWorxRoster(fileName) {
  return (
    typeof fileName === "string" &&
    fileName.startsWith(CLUBWORX_ROSTER_PREFIX)
  );
}

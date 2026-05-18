import { parseDate } from "../dates";
import { normaliseRank } from "../rank";
import { deduplicateStudents } from "../deduplicate";

/** @typedef {'adults'|'kids'} RosterCategory */

/**
 * @param {string|null|undefined} styleName
 * @returns {RosterCategory|null}
 */
export function categoryFromStyleName(styleName) {
  const name = String(styleName || "").toLowerCase();
  if (name.includes("kids")) return "kids";
  if (name.includes("adults")) return "adults";
  return null;
}

/**
 * @param {string|null|undefined} status
 * @param {Set<string>} excludedStatuses
 */
export function isMemberStatusIncluded(status, excludedStatuses) {
  if (!status) return true;
  return !excludedStatuses.has(String(status).trim());
}

/**
 * @param {Record<string, unknown>} record
 * @param {Map<string, Record<string, unknown>>} memberByContactKey
 * @param {Set<string>} excludedStatuses
 * @returns {import('../parseExcel').Student|null}
 */
export function memberStyleToStudent(record, memberByContactKey, excludedStatuses) {
  const contactKey = String(record.contact_key || "");
  const member = contactKey ? memberByContactKey.get(contactKey) : null;

  if (member && !isMemberStatusIncluded(member.status, excludedStatuses)) {
    return null;
  }

  const firstName = String(
    record.contact_first_name || member?.first_name || ""
  ).trim();
  const lastName = String(
    record.contact_last_name || member?.last_name || ""
  ).trim();
  if (!firstName && !lastName) return null;

  const currentRank = String(record.current_rank_name || "").trim();
  const nextRank = String(record.next_rank_name || "").trim();

  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    currentRank,
    nextRank,
    beltSize: record.belt_size != null ? String(record.belt_size).trim() : "",
    email: String(member?.email || "").trim(),
    phone: String(member?.phone || "").trim(),
    promotionDate: null,
    mostRecentPromotion: parseDate(record.last_promoted_on),
    currentParsed: normaliseRank(currentRank),
    nextParsed: normaliseRank(nextRank),
  };
}

/**
 * @param {Record<string, unknown>[]} memberStyles
 * @param {Record<string, unknown>[]} members
 * @param {{ excludedStatuses?: string[] }} [options]
 */
export function buildRosterFromClubWorx(memberStyles, members, options = {}) {
  const excludedStatuses = new Set(
    options.excludedStatuses ?? ["Cancelled"]
  );

  const memberByContactKey = new Map();
  for (const member of members) {
    const key = String(member.contact_key || "");
    if (key) memberByContactKey.set(key, member);
  }

  const adultsRaw = [];
  const kidsRaw = [];
  let skippedUnknownStyle = 0;
  let skippedNoName = 0;
  let skippedExcludedStatus = 0;

  for (const record of memberStyles) {
    const category = categoryFromStyleName(record.style_name);
    if (!category) {
      skippedUnknownStyle += 1;
      continue;
    }

    const contactKey = String(record.contact_key || "");
    const member = contactKey ? memberByContactKey.get(contactKey) : null;
    if (member && !isMemberStatusIncluded(member.status, excludedStatuses)) {
      skippedExcludedStatus += 1;
      continue;
    }

    const student = memberStyleToStudent(
      record,
      memberByContactKey,
      excludedStatuses
    );
    if (!student) {
      skippedNoName += 1;
      continue;
    }

    if (category === "adults") adultsRaw.push(student);
    else kidsRaw.push(student);
  }

  const adultsDeduped = deduplicateStudents(adultsRaw);
  const kidsDeduped = deduplicateStudents(kidsRaw);

  return {
    adults: adultsDeduped.students,
    kids: kidsDeduped.students,
    stats: {
      memberStylesTotal: memberStyles.length,
      membersTotal: members.length,
      adultsCount: adultsDeduped.students.length,
      kidsCount: kidsDeduped.students.length,
      duplicatesRemoved:
        adultsDeduped.duplicatesRemoved + kidsDeduped.duplicatesRemoved,
      skippedUnknownStyle,
      skippedNoName,
      skippedExcludedStatus,
    },
  };
}

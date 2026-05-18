import * as XLSX from "xlsx";
import { parseDate } from "./dates";
import { normaliseRank } from "./rank";
import { deduplicateStudents } from "./deduplicate";

export const REQUIRED_HEADERS = [
  "First Name",
  "Last Name",
  "Current Rank",
  "Next Rank",
  "Belt Size",
  "Promotion Date",
  "Email",
  "Phone Number",
  "Most Recent Promotion",
];

/**
 * @typedef {Object} Student
 * @property {string} [contactKey] ClubWorx contact_key when synced from API
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName
 * @property {string} currentRank
 * @property {string} nextRank
 * @property {string} beltSize
 * @property {string} email
 * @property {string} phone
 * @property {Date|null} promotionDate
 * @property {Date|null} mostRecentPromotion
 * @property {{ belt: string, stripes: number|null, label: string, raw: string }} currentParsed
 * @property {{ belt: string, stripes: number|null, label: string, raw: string }} nextParsed
 */

/**
 * @param {string} value
 * @returns {string}
 */
function cellString(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Student|null}
 */
function rowToStudent(row) {
  const firstName = cellString(row["First Name"]);
  const lastName = cellString(row["Last Name"]);
  if (!firstName && !lastName) return null;

  const currentRank = cellString(row["Current Rank"]);
  const nextRank = cellString(row["Next Rank"]);

  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    currentRank,
    nextRank,
    beltSize: cellString(row["Belt Size"]),
    email: cellString(row["Email"]),
    phone: cellString(row["Phone Number"]),
    promotionDate: parseDate(row["Promotion Date"]),
    mostRecentPromotion: parseDate(row["Most Recent Promotion"]),
    currentParsed: normaliseRank(currentRank),
    nextParsed: normaliseRank(nextRank),
  };
}

/**
 * @param {string[]} headers
 * @returns {string[]|null} missing headers
 */
export function validateHeaders(headers) {
  const normalised = headers.map((h) => String(h || "").trim());
  const missing = REQUIRED_HEADERS.filter((req) => !normalised.includes(req));
  return missing.length ? missing : null;
}

/**
 * Parse ArrayBuffer from .xlsx/.xls
 * @param {ArrayBuffer} buffer
 * @returns {{ students: Student[], duplicatesRemoved?: number, error?: string }}
 */
export function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { students: [], error: "Workbook has no sheets." };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    return { students: [], error: "Sheet is empty." };
  }

  const headers = Object.keys(rows[0]);
  const missing = validateHeaders(headers);
  if (missing) {
    return {
      students: [],
      error: `Missing columns: ${missing.join(", ")}`,
    };
  }

  const raw = rows.map((row) => rowToStudent(row)).filter(Boolean);
  const { students, duplicatesRemoved } = deduplicateStudents(raw);

  return { students, duplicatesRemoved };
}

/**
 * @param {File} file
 * @returns {Promise<{ students: Student[], error?: string }>}
 */
export async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer);
}

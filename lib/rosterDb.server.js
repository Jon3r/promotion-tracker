import "server-only";
import { getSql, isPostgresConfigured, ROSTER_SLUG } from "./db.server";
import { serializeDataset } from "./datasetSerialize";

/** @param {unknown} value */
function parseJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Raw serialized dataset blobs as stored in JSONB (with `version` + `students`).
 * @returns {Promise<{ adults: object, kids: object, updatedAt: string|null }|null>}
 */
export async function getRoster() {
  const sql = await getSql();
  if (!sql) return null;

  const rows = await sql`
    SELECT adults, kids, updated_at
    FROM rosters
    WHERE slug = ${ROSTER_SLUG}
    LIMIT 1
  `;

  const row = rows.rows[0];
  if (!row) return null;

  return {
    adults: parseJsonColumn(row.adults),
    kids: parseJsonColumn(row.kids),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
  };
}

/**
 * @param {{ adults: object, kids: object }} payload Serialized dataset blobs from API
 */
export async function saveRoster(payload) {
  const sql = await getSql();
  if (!sql) {
    throw new Error("Database not configured");
  }

  const adultsJson = payload.adults?.version
    ? payload.adults
    : serializeDataset(payload.adults);
  const kidsJson = payload.kids?.version
    ? payload.kids
    : serializeDataset(payload.kids);

  await sql`
    INSERT INTO rosters (slug, adults, kids, updated_at)
    VALUES (${ROSTER_SLUG}, ${adultsJson}, ${kidsJson}, NOW())
    ON CONFLICT (slug) DO UPDATE SET
      adults = EXCLUDED.adults,
      kids = EXCLUDED.kids,
      updated_at = NOW()
  `;
}

/**
 * @param {'adults'|'kids'} category
 * @param {{ memberStyleId?: number|null, contactKey?: string, beltSize: string }} match
 */
export async function patchStudentBeltSize(category, match) {
  const sql = await getSql();
  if (!sql) throw new Error("Database not configured");

  const roster = await getRoster();
  if (!roster) throw new Error("Roster not found");

  const column = category === "kids" ? "kids" : "adults";
  const blob = parseJsonColumn(roster[column]);
  if (!blob?.students || !Array.isArray(blob.students)) {
    throw new Error("Invalid roster data");
  }

  let found = false;
  const students = blob.students.map((s) => {
    const idMatch =
      match.memberStyleId != null && s.memberStyleId === match.memberStyleId;
    const keyMatch =
      match.contactKey && s.contactKey === match.contactKey;
    if (idMatch || keyMatch) {
      found = true;
      return { ...s, beltSize: match.beltSize };
    }
    return s;
  });

  if (!found) {
    throw new Error("Student not found in roster");
  }

  const updated = { ...blob, students };
  const adults = column === "adults" ? updated : roster.adults;
  const kids = column === "kids" ? updated : roster.kids;

  await sql`
    INSERT INTO rosters (slug, adults, kids, updated_at)
    VALUES (${ROSTER_SLUG}, ${adults}, ${kids}, NOW())
    ON CONFLICT (slug) DO UPDATE SET
      adults = EXCLUDED.adults,
      kids = EXCLUDED.kids,
      updated_at = NOW()
  `;
}

export { isPostgresConfigured };

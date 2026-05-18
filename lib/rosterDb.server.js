import "server-only";
import { getSql, isPostgresConfigured, ROSTER_SLUG } from "./db.server";
import { deserializeDataset, serializeDataset } from "./datasetSerialize";

/**
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
    adults: deserializeDataset(row.adults),
    kids: deserializeDataset(row.kids),
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

export { isPostgresConfigured };

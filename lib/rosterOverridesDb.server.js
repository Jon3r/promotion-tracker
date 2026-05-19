import "server-only";
import { getSql, isPostgresConfigured } from "./db.server";

/**
 * @returns {Promise<{ adults: Record<string, string>, kids: Record<string, string> }>}
 */
export async function getGradingOverrides() {
  const sql = await getSql();
  if (!sql) return { adults: {}, kids: {} };

  const rows = await sql`
    SELECT contact_key, category, grading_belt
    FROM roster_overrides
    WHERE grading_belt IS NOT NULL
  `;

  const adults = {};
  const kids = {};
  for (const row of rows.rows) {
    if (!row.grading_belt) continue;
    if (row.category === "kids") kids[row.contact_key] = row.grading_belt;
    else adults[row.contact_key] = row.grading_belt;
  }
  return { adults, kids };
}

/**
 * @param {'adults'|'kids'} category
 * @param {Record<string, string>} overrides contact_key -> grading_belt
 */
export async function setGradingOverridesForCategory(category, overrides) {
  const sql = await getSql();
  if (!sql) throw new Error("Database not configured");

  await sql`
    DELETE FROM roster_overrides
    WHERE category = ${category}
  `;

  const entries = Object.entries(overrides).filter(([, belt]) => belt);
  for (const [contactKey, gradingBelt] of entries) {
    await sql`
      INSERT INTO roster_overrides (contact_key, category, grading_belt, updated_at)
      VALUES (${contactKey}, ${category}, ${gradingBelt}, NOW())
      ON CONFLICT (contact_key, category) DO UPDATE SET
        grading_belt = EXCLUDED.grading_belt,
        updated_at = NOW()
    `;
  }
}

/**
 * @param {'adults'|'kids'} category
 * @param {string} contactKey
 * @param {string} gradingBelt
 */
export async function upsertGradingOverride(category, contactKey, gradingBelt) {
  const sql = await getSql();
  if (!sql) throw new Error("Database not configured");

  await sql`
    INSERT INTO roster_overrides (contact_key, category, grading_belt, updated_at)
    VALUES (${contactKey}, ${category}, ${gradingBelt}, NOW())
    ON CONFLICT (contact_key, category) DO UPDATE SET
      grading_belt = EXCLUDED.grading_belt,
      updated_at = NOW()
  `;
}

/**
 * @param {'adults'|'kids'} category
 */
export async function clearGradingOverrides(category) {
  const sql = await getSql();
  if (!sql) throw new Error("Database not configured");

  await sql`DELETE FROM roster_overrides WHERE category = ${category}`;
}

export { isPostgresConfigured };

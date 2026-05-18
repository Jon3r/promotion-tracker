import "server-only";

export const ROSTER_SLUG = "default";

export function isPostgresConfigured() {
  return Boolean(process.env.POSTGRES_URL);
}

/**
 * @returns {Promise<import('@vercel/postgres').VercelPoolSql> | null>}
 */
export async function getSql() {
  if (!isPostgresConfigured()) return null;
  const { sql } = await import("@vercel/postgres");
  return sql;
}

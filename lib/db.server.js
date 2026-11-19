import "server-only";

export const ROSTER_SLUG = "default";

/**
 * Prefer the pooled URL, then the direct/non-pooling URL.
 * Neon/Vercel sometimes leave only one of these set after migrations.
 */
function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

export function isPostgresConfigured() {
  return Boolean(getConnectionString());
}

/** @type {null | ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ rows: any[] }>)} */
let cachedSql = null;

/**
 * SQL tagged-template helper compatible with existing callers that read `.rows`.
 * Uses Neon's HTTP driver so both pooled (`-pooler.`) and direct connection
 * strings work — `@vercel/postgres`'s default `sql` proxy rejects direct URLs.
 *
 * @returns {Promise<((strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ rows: any[] }>) | null>}
 */
export async function getSql() {
  const connectionString = getConnectionString();
  if (!connectionString) return null;
  if (cachedSql) return cachedSql;

  const { neon } = await import("@neondatabase/serverless");
  const query = neon(connectionString, { fullResults: true });

  /**
   * @param {TemplateStringsArray} strings
   * @param {...unknown} values
   */
  cachedSql = async function sql(strings, ...values) {
    return query(strings, ...values);
  };

  return cachedSql;
}

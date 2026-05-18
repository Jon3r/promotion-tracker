import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { getSql, isPostgresConfigured } from "./db.server";

const SHARE_VERSION = 1;
const TTL_DAYS = 90;
const DATA_DIR = path.join(process.cwd(), ".data", "shares");

function generateShareId() {
  return randomBytes(8).toString("hex");
}

/**
 * @param {{ adults: object, kids: object }} body
 */
export async function createShare(body) {
  const id = generateShareId();
  const payload = {
    version: SHARE_VERSION,
    createdAt: new Date().toISOString(),
    adults: body.adults,
    kids: body.kids,
  };

  if (isPostgresConfigured()) {
    const sql = await getSql();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TTL_DAYS);

    await sql`
      INSERT INTO shares (id, adults, kids, created_at, expires_at)
      VALUES (
        ${id},
        ${body.adults},
        ${body.kids},
        NOW(),
        ${expiresAt.toISOString()}::timestamptz
      )
    `;
    return id;
  }

  if (process.env.NODE_ENV === "development") {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, `${id}.json`),
      JSON.stringify(payload),
      "utf8"
    );
    return id;
  }

  throw new Error("Database not configured");
}

/**
 * @param {string} id
 */
export async function getShare(id) {
  if (!id || !/^[a-f0-9]{16}$/.test(id)) {
    return null;
  }

  if (isPostgresConfigured()) {
    const sql = await getSql();
    const rows = await sql`
      SELECT adults, kids, created_at
      FROM shares
      WHERE id = ${id}
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;
    const row = rows.rows[0];
    if (!row) return null;

    return {
      version: SHARE_VERSION,
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
      adults: row.adults,
      kids: row.kids,
    };
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
      const data = JSON.parse(raw);
      if (data.version !== SHARE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  return null;
}

export function isShareStorageConfigured() {
  return isPostgresConfigured() || process.env.NODE_ENV === "development";
}

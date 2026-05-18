import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const SHARE_VERSION = 1;
const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const DATA_DIR = path.join(process.cwd(), ".data", "shares");

function useKv() {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

async function getKv() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

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

  if (useKv()) {
    const kv = await getKv();
    await kv.set(`share:${id}`, payload, { ex: TTL_SECONDS });
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, `${id}.json`),
      JSON.stringify(payload),
      "utf8"
    );
  }

  return id;
}

/**
 * @param {string} id
 */
export async function getShare(id) {
  if (!id || !/^[a-f0-9]{16}$/.test(id)) {
    return null;
  }

  if (useKv()) {
    const kv = await getKv();
    const data = await kv.get(`share:${id}`);
    if (!data || data.version !== SHARE_VERSION) return null;
    return data;
  }

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${id}.json`), "utf8");
    const data = JSON.parse(raw);
    if (data.version !== SHARE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function isShareStorageConfigured() {
  return useKv() || process.env.NODE_ENV === "development";
}

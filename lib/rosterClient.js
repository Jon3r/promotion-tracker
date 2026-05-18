import { serializeDataset } from "./datasetSerialize";

/**
 * @param {{ adults: object, kids: object, password?: string }} payload
 */
export async function fetchRoster() {
  const res = await fetch("/api/roster");
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error, configured: data.configured };
  }
  return { ok: true, ...data };
}

/**
 * @param {{ adults: object, kids: object, password?: string }} payload
 */
export async function saveRosterToCloud(payload) {
  const res = await fetch("/api/roster", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: payload.password,
      adults: serializeDataset(payload.adults),
      kids: serializeDataset(payload.kids),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true, updatedAt: data.updatedAt };
}

/**
 * Pick dataset with newer savedAt.
 * @param {object} local
 * @param {object} remote
 */
/**
 * @param {{ password?: string }} [options]
 */
export async function syncRosterFromClubWorx(options = {}) {
  const res = await fetch("/api/roster/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: options.password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true, ...data };
}

/**
 * @returns {Promise<{ postgresConfigured: boolean, clubworxConfigured: boolean }>}
 */
export async function fetchSyncStatus() {
  const res = await fetch("/api/roster/sync");
  const data = await res.json();
  return data;
}

export function mergeDataset(local, remote) {
  if (!remote?.students?.length) return local;
  if (!local?.students?.length) return remote;

  const lt = local.savedAt ? new Date(local.savedAt).getTime() : 0;
  const rt = remote.savedAt ? new Date(remote.savedAt).getTime() : 0;
  return rt >= lt ? remote : local;
}

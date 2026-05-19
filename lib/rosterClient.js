import { serializeDataset } from "./datasetSerialize";

export async function fetchRoster() {
  const res = await fetch("/api/roster");
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error, configured: data.configured };
  }
  return { ok: true, ...data };
}

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

export async function fetchSyncStatus() {
  const res = await fetch("/api/roster/sync");
  return res.json();
}

export async function fetchGradingOverrides() {
  const res = await fetch("/api/roster/overrides");
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error, adults: {}, kids: {} };
  }
  return {
    ok: true,
    adults: data.adults || {},
    kids: data.kids || {},
  };
}

/**
 * @param {{ category: 'adults'|'kids', contactKeys: { contactKey: string, gradingBelt: string }[], password?: string }} payload
 */
export async function saveGradingBulkMove(payload) {
  const res = await fetch("/api/roster/overrides", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: payload.password,
      category: payload.category,
      bulkMove: true,
      contactKeys: payload.contactKeys,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true, ...data };
}

/**
 * @param {{ category: 'adults'|'kids', password?: string }} payload
 */
/**
 * @param {{ category: 'adults'|'kids', contactKey: string, gradingBelt?: string, password?: string }} payload
 */
export async function saveStudentGradingOverride(payload) {
  const res = await fetch("/api/roster/overrides", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: payload.password,
      category: payload.category,
      contactKey: payload.contactKey,
      gradingBelt: payload.gradingBelt || "",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true };
}

export async function fetchGiSizes() {
  const res = await fetch("/api/clubworx/gi-sizes");
  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data.error,
      adults: [],
      kids: [],
    };
  }
  return {
    ok: true,
    adults: data.adults || [],
    kids: data.kids || [],
  };
}

export async function clearGradingOverrides(payload) {
  const res = await fetch("/api/roster/overrides", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: payload.password,
      category: payload.category,
      clear: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true };
}

/**
 * @param {{ memberStyleId: number, category: 'adults'|'kids', contactKey?: string, beltSize: string, password?: string }} payload
 */
export async function updateStudentGiSize(payload) {
  const res = await fetch(
    `/api/clubworx/member-style/${payload.memberStyleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: payload.password,
        category: payload.category,
        contactKey: payload.contactKey,
        beltSize: payload.beltSize,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error };
  }
  return { ok: true, beltSize: data.beltSize };
}

export function mergeDataset(local, remote) {
  if (!remote?.students?.length) return local;
  if (!local?.students?.length) return remote;

  const lt = local.savedAt ? new Date(local.savedAt).getTime() : 0;
  const rt = remote.savedAt ? new Date(remote.savedAt).getTime() : 0;
  return rt >= lt ? remote : local;
}

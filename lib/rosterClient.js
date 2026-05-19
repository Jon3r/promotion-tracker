import { serializeDataset } from "./datasetSerialize";
import {
  loadLocalGradingOverrides,
  patchLocalGradingOverride,
} from "./gradingOverridesLocal";
import { patchLocalGiSizeOverride } from "./giSizeOverridesLocal";

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
  const local = loadLocalGradingOverrides();
  const res = await fetch("/api/roster/overrides");
  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data.error,
      adults: local.adults,
      kids: local.kids,
      localOnly: true,
    };
  }
  return {
    ok: true,
    adults: { ...local.adults, ...(data.adults || {}) },
    kids: { ...local.kids, ...(data.kids || {}) },
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
    if (res.status === 503 || res.status === 500) {
      for (const entry of payload.contactKeys || []) {
        if (entry.contactKey && entry.gradingBelt) {
          patchLocalGradingOverride(
            payload.category,
            entry.contactKey,
            entry.gradingBelt
          );
        }
      }
      return {
        ok: true,
        localOnly: true,
        warning:
          data.error ||
          "Saved on this device only. Run scripts/init-db.sql on Postgres.",
      };
    }
    return { ok: false, error: data.error };
  }
  for (const entry of payload.contactKeys || []) {
    if (entry.contactKey && entry.gradingBelt) {
      patchLocalGradingOverride(
        payload.category,
        entry.contactKey,
        entry.gradingBelt
      );
    }
  }
  return { ok: true, ...data };
}

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
  if (res.ok) {
    patchLocalGradingOverride(
      payload.category,
      payload.contactKey,
      payload.gradingBelt || ""
    );
    return { ok: true };
  }
  if (res.status === 401) {
    return {
      ok: false,
      error:
        data.error ||
        "Invalid sync password. Enter the sync password above and try again.",
    };
  }
  if (res.status === 503 || res.status === 500) {
    patchLocalGradingOverride(
      payload.category,
      payload.contactKey,
      payload.gradingBelt || ""
    );
    return {
      ok: true,
      localOnly: true,
      warning:
        data.error ||
        "Saved on this device only. Run scripts/init-db.sql on Postgres or check the sync password.",
    };
  }
  return { ok: false, error: data.error || "Could not save grading belt" };
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
  if (!payload.contactKey) {
    return { ok: false, error: "Missing member contact key" };
  }

  const res = await fetch("/api/roster/gi-size", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: payload.password,
      category: payload.category,
      contactKey: payload.contactKey,
      memberStyleId: payload.memberStyleId ?? null,
      beltSize: payload.beltSize,
    }),
  });
  const data = await res.json();

  if (res.ok) {
    patchLocalGiSizeOverride(
      payload.category,
      payload.contactKey,
      payload.beltSize
    );
    return {
      ok: true,
      beltSize: data.beltSize,
      warning: data.warning || null,
      clubworxSynced: data.clubworxSynced === true,
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      error:
        data.error ||
        "Invalid sync password. Enter the sync password above and try again.",
    };
  }

  if (res.status === 503 || res.status === 500) {
    patchLocalGiSizeOverride(
      payload.category,
      payload.contactKey,
      payload.beltSize
    );
    return {
      ok: true,
      beltSize: payload.beltSize,
      localOnly: true,
      warning:
        data.error ||
        "Saved on this device only. Check database setup or sync password.",
    };
  }

  return { ok: false, error: data.error || "Could not save Gi size" };
}

export function mergeDataset(local, remote) {
  if (!remote?.students?.length) return local;
  if (!local?.students?.length) return remote;

  const lt = local.savedAt ? new Date(local.savedAt).getTime() : 0;
  const rt = remote.savedAt ? new Date(remote.savedAt).getTime() : 0;
  return rt >= lt ? remote : local;
}

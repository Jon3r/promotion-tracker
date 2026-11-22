import "server-only";
import { getSql, isPostgresConfigured } from "@/lib/db.server";
import {
  applyTimerCommand,
  createDefaultTimerState,
  DEFAULT_READY_SEC,
  normalizeTimerState,
} from "./engine";

const TIMER_ROW_ID = "default";
const POSTGRES_RETRY_MS = 30_000;
/** Previous shipped default; bump persisted rows that still use it. */
const LEGACY_READY_SEC = 3;

/**
 * Ready duration is not exposed in the coach UI, so a stored value of 3 is
 * always the old default — rewrite to the current default (10s).
 * @param {ReturnType<typeof createDefaultTimerState>} state
 */
function migrateReadyDuration(state) {
  if (state?.readyDurationSec === LEGACY_READY_SEC) {
    return { ...state, readyDurationSec: DEFAULT_READY_SEC };
  }
  return state;
}

/**
 * @returns {{ state: ReturnType<typeof createDefaultTimerState>, listeners: Set<(payload: { state: object, serverNowMs: number, storage: string }) => void>, tableEnsured: boolean, ensurePromise: Promise<void> | null, postgresUnavailableUntil: number }}
 */
function getMemoryStore() {
  if (!globalThis.__bjjGymStore) {
    globalThis.__bjjGymStore = {
      state: createDefaultTimerState(),
      listeners: new Set(),
      tableEnsured: false,
      ensurePromise: null,
      postgresUnavailableUntil: 0,
    };
  }
  return globalThis.__bjjGymStore;
}

function shouldSkipPostgres() {
  const mem = getMemoryStore();
  return Date.now() < (mem.postgresUnavailableUntil || 0);
}

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

/** @param {unknown} value */
function toJsonbParam(value) {
  // @vercel/postgres / neon only accept primitive SQL params; JSONB must be a string.
  return JSON.stringify(value ?? {});
}

/**
 * @param {unknown} error
 */
function markPostgresUnavailable(error) {
  const mem = getMemoryStore();
  mem.postgresUnavailableUntil = Date.now() + POSTGRES_RETRY_MS;
  mem.tableEnsured = false;
  console.error("Gym timer Postgres unavailable; using in-memory store:", error);
}

async function ensureTimerTable(sql) {
  const mem = getMemoryStore();
  if (mem.tableEnsured) return;
  if (!mem.ensurePromise) {
    mem.ensurePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS gym_timer_state (
          id TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      mem.tableEnsured = true;
      mem.postgresUnavailableUntil = 0;
    })().finally(() => {
      mem.ensurePromise = null;
    });
  }
  await mem.ensurePromise;
}

/**
 * @param {number} [nowMs]
 */
async function readState(nowMs = Date.now()) {
  const mem = getMemoryStore();
  if (!isPostgresConfigured() || shouldSkipPostgres()) {
    const normalized = migrateReadyDuration(
      normalizeTimerState(mem.state, nowMs)
    );
    if (normalized.readyDurationSec !== mem.state?.readyDurationSec) {
      mem.state = normalized;
    }
    return {
      state: normalized,
      storage: shouldSkipPostgres() ? "memory-fallback" : "memory",
    };
  }

  try {
    const sql = await getSql();
    await ensureTimerTable(sql);

    const rows = await sql`
      SELECT state
      FROM gym_timer_state
      WHERE id = ${TIMER_ROW_ID}
      LIMIT 1
    `;

    const row = rows.rows[0];
    if (!row) {
      const initial = createDefaultTimerState({}, nowMs);
      const initialJson = toJsonbParam(initial);
      await sql`
        INSERT INTO gym_timer_state (id, state, updated_at)
        VALUES (${TIMER_ROW_ID}, ${initialJson}::jsonb, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      mem.state = initial;
      return { state: initial, storage: "postgres" };
    }

    const parsed = parseJsonColumn(row.state);
    const normalized = migrateReadyDuration(
      normalizeTimerState(parsed, nowMs)
    );
    mem.state = normalized;

    // Persist one-time ready-duration bump from legacy default (3 → 10)
    if (parsed?.readyDurationSec === LEGACY_READY_SEC) {
      try {
        const stateJson = toJsonbParam(normalized);
        await sql`
          UPDATE gym_timer_state
          SET state = ${stateJson}::jsonb, updated_at = NOW()
          WHERE id = ${TIMER_ROW_ID}
        `;
      } catch (error) {
        console.error("Failed to persist readyDurationSec migration:", error);
      }
    }

    return { state: normalized, storage: "postgres" };
  } catch (error) {
    markPostgresUnavailable(error);
    return {
      state: migrateReadyDuration(normalizeTimerState(mem.state, nowMs)),
      storage: "memory-fallback",
    };
  }
}

/**
 * @param {ReturnType<typeof createDefaultTimerState>} nextState
 */
async function writeState(nextState) {
  const mem = getMemoryStore();
  mem.state = nextState;

  if (!isPostgresConfigured() || shouldSkipPostgres()) {
    return shouldSkipPostgres() ? "memory-fallback" : "memory";
  }

  try {
    const sql = await getSql();
    await ensureTimerTable(sql);
    const stateJson = toJsonbParam(nextState);

    await sql`
      INSERT INTO gym_timer_state (id, state, updated_at)
      VALUES (${TIMER_ROW_ID}, ${stateJson}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        state = EXCLUDED.state,
        updated_at = NOW()
    `;

    return "postgres";
  } catch (error) {
    markPostgresUnavailable(error);
    return "memory-fallback";
  }
}

function notifyListeners(payload) {
  const mem = getMemoryStore();
  for (const listener of mem.listeners) {
    try {
      listener(payload);
    } catch {
      // Ignore individual broken stream listeners
    }
  }
}

/**
 * @returns {Promise<{ state: ReturnType<typeof createDefaultTimerState>, serverNowMs: number, storage: string }>}
 */
export async function getTimerStateSnapshot() {
  const nowMs = Date.now();
  const { state, storage } = await readState(nowMs);
  return { state, serverNowMs: nowMs, storage };
}

/**
 * @param {object} command
 * @returns {Promise<{ state: ReturnType<typeof createDefaultTimerState>, serverNowMs: number, storage: string }>}
 */
export async function mutateTimerState(command) {
  const nowMs = Date.now();
  const { state: current } = await readState(nowMs);
  const next = applyTimerCommand(current, command, nowMs);
  const storage = await writeState(next);
  const payload = { state: next, serverNowMs: nowMs, storage };
  notifyListeners(payload);
  return payload;
}

/**
 * @param {(payload: { state: object, serverNowMs: number, storage: string }) => void} listener
 * @returns {() => void}
 */
export function subscribeTimerUpdates(listener) {
  const mem = getMemoryStore();
  mem.listeners.add(listener);
  return () => {
    mem.listeners.delete(listener);
  };
}

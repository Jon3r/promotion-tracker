import "server-only";
import { getSql, isPostgresConfigured } from "@/lib/db.server";
import {
  applyTimerCommand,
  createDefaultTimerState,
  normalizeTimerState,
} from "./engine";

const TIMER_ROW_ID = "default";

/**
 * @returns {{ state: ReturnType<typeof createDefaultTimerState>, listeners: Set<(payload: { state: object, serverNowMs: number, storage: string }) => void>, tableEnsured: boolean, ensurePromise: Promise<void> | null }}
 */
function getMemoryStore() {
  if (!globalThis.__bjjGymStore) {
    globalThis.__bjjGymStore = {
      state: createDefaultTimerState(),
      listeners: new Set(),
      tableEnsured: false,
      ensurePromise: null,
    };
  }
  return globalThis.__bjjGymStore;
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
  if (!isPostgresConfigured()) {
    return {
      state: normalizeTimerState(mem.state, nowMs),
      storage: "memory",
    };
  }

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
    await sql`
      INSERT INTO gym_timer_state (id, state, updated_at)
      VALUES (${TIMER_ROW_ID}, ${initial}, NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    mem.state = initial;
    return { state: initial, storage: "postgres" };
  }

  const parsed = parseJsonColumn(row.state);
  const normalized = normalizeTimerState(parsed, nowMs);
  mem.state = normalized;
  return { state: normalized, storage: "postgres" };
}

/**
 * @param {ReturnType<typeof createDefaultTimerState>} nextState
 */
async function writeState(nextState) {
  const mem = getMemoryStore();
  mem.state = nextState;

  if (!isPostgresConfigured()) {
    return "memory";
  }

  const sql = await getSql();
  await ensureTimerTable(sql);

  await sql`
    INSERT INTO gym_timer_state (id, state, updated_at)
    VALUES (${TIMER_ROW_ID}, ${nextState}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      state = EXCLUDED.state,
      updated_at = NOW()
  `;

  return "postgres";
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

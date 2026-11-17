import { findMatchingPreset, getPresetById } from "./presets";

export const DEFAULT_ROUND_SEC = 300;
export const DEFAULT_REST_SEC = 20;
export const DEFAULT_TOTAL_ROUNDS = 0; // 0 = unlimited
export const DEFAULT_READY_SEC = 3;

export const MIN_ROUND_SEC = 30;
export const MAX_ROUND_SEC = 3600;
export const ROUND_STEP_SEC = 30;

export const MIN_REST_SEC = 10;
export const MAX_REST_SEC = 600;
export const REST_STEP_SEC = 10;

export const MIN_TOTAL_ROUNDS = 0;
export const MAX_TOTAL_ROUNDS = 99;

export const DISPLAY_MODES = ["split", "timer", "check-in"];
export const POPUP_MODES = ["auto", "full", "toast"];
export const GYM_TIME_ZONE = "Australia/Sydney";

/**
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * @param {Partial<TimerState>} [overrides]
 * @param {number} [nowMs]
 */
export function createDefaultTimerState(overrides = {}, nowMs = Date.now()) {
  const roundDurationSec = clampInt(
    overrides.roundDurationSec,
    MIN_ROUND_SEC,
    MAX_ROUND_SEC,
    DEFAULT_ROUND_SEC
  );
  const restDurationSec = clampInt(
    overrides.restDurationSec,
    MIN_REST_SEC,
    MAX_REST_SEC,
    DEFAULT_REST_SEC
  );
  const totalRounds = clampInt(
    overrides.totalRounds,
    MIN_TOTAL_ROUNDS,
    MAX_TOTAL_ROUNDS,
    DEFAULT_TOTAL_ROUNDS
  );
  const readyDurationSec = clampInt(
    overrides.readyDurationSec,
    0,
    30,
    DEFAULT_READY_SEC
  );

  const displayMode = DISPLAY_MODES.includes(overrides.displayMode)
    ? overrides.displayMode
    : "split";
  const popupMode = POPUP_MODES.includes(overrides.popupMode)
    ? overrides.popupMode
    : "auto";

  const base = {
    roundDurationSec,
    restDurationSec,
    totalRounds,
    readyDurationSec,
    status: "idle",
    phase: "idle",
    currentRound: 0,
    phaseStartedAtMs: null,
    phaseEndsAtMs: null,
    remainingMsAtPause: null,
    displayMode,
    autoSwitchOnTimer: Boolean(overrides.autoSwitchOnTimer),
    popupMode,
    activePresetId: overrides.activePresetId ?? null,
    updatedAtMs: Number.isFinite(overrides.updatedAtMs)
      ? overrides.updatedAtMs
      : nowMs,
    version: Number.isFinite(overrides.version) ? overrides.version : 1,
  };

  if (!base.activePresetId) {
    const matched = findMatchingPreset(base);
    if (matched) base.activePresetId = matched.id;
  }

  return base;
}

/**
 * Normalize an untrusted persisted state object into a valid TimerState.
 * @param {unknown} raw
 * @param {number} [nowMs]
 */
export function normalizeTimerState(raw, nowMs = Date.now()) {
  if (!raw || typeof raw !== "object") {
    return createDefaultTimerState({}, nowMs);
  }
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const base = createDefaultTimerState(
    {
      roundDurationSec: /** @type {number} */ (obj.roundDurationSec),
      restDurationSec: /** @type {number} */ (obj.restDurationSec),
      totalRounds: /** @type {number} */ (obj.totalRounds),
      readyDurationSec: /** @type {number} */ (obj.readyDurationSec),
      displayMode: /** @type {string} */ (obj.displayMode),
      autoSwitchOnTimer: Boolean(obj.autoSwitchOnTimer),
      popupMode: /** @type {string} */ (obj.popupMode),
      activePresetId:
        typeof obj.activePresetId === "string" ? obj.activePresetId : null,
      updatedAtMs: Number(obj.updatedAtMs),
      version: Number(obj.version),
    },
    nowMs
  );

  const validStatus =
    obj.status === "running" || obj.status === "paused" || obj.status === "idle"
      ? obj.status
      : "idle";
  const validPhase =
    obj.phase === "ready" ||
    obj.phase === "work" ||
    obj.phase === "rest" ||
    obj.phase === "idle"
      ? obj.phase
      : "idle";

  if (validStatus === "idle" || validPhase === "idle") {
    return base;
  }

  return {
    ...base,
    status: validStatus,
    phase: validPhase,
    currentRound: clampInt(obj.currentRound, 1, MAX_TOTAL_ROUNDS, 1),
    phaseStartedAtMs: Number.isFinite(Number(obj.phaseStartedAtMs))
      ? Number(obj.phaseStartedAtMs)
      : null,
    phaseEndsAtMs: Number.isFinite(Number(obj.phaseEndsAtMs))
      ? Number(obj.phaseEndsAtMs)
      : null,
    remainingMsAtPause: Number.isFinite(Number(obj.remainingMsAtPause))
      ? Math.max(0, Number(obj.remainingMsAtPause))
      : null,
  };
}

/**
 * Duration in ms of a given phase.
 * @param {{ roundDurationSec: number, restDurationSec: number, readyDurationSec: number }} state
 * @param {"idle"|"ready"|"work"|"rest"} phase
 * @returns {number}
 */
export function getPhaseDurationMs(state, phase) {
  if (phase === "ready") return (state.readyDurationSec ?? DEFAULT_READY_SEC) * 1000;
  if (phase === "work") return state.roundDurationSec * 1000;
  if (phase === "rest") return state.restDurationSec * 1000;
  return 0;
}

/**
 * Advance a running state mathematically to `nowMs` in O(1) time.
 * @param {ReturnType<typeof createDefaultTimerState>} state
 * @param {number} [nowMs]
 */
export function resolveRunningPhase(state, nowMs = Date.now()) {
  if (state.status !== "running" || state.phase === "idle") {
    return state;
  }

  const phaseEndsAtMs = state.phaseEndsAtMs ?? nowMs;
  if (nowMs < phaseEndsAtMs) {
    return state;
  }

  const roundMs = state.roundDurationSec * 1000;
  const restMs = state.restDurationSec * 1000;
  const totalRounds = state.totalRounds;
  const cycleMs = roundMs + restMs;

  let elapsedAfterPhaseMs = nowMs - phaseEndsAtMs;
  let nextPhase = state.phase;
  let nextRound = Math.max(1, state.currentRound);
  let cursorStartMs = phaseEndsAtMs;

  if (nextPhase === "ready") {
    nextPhase = "work";
    nextRound = 1;
    if (elapsedAfterPhaseMs < roundMs) {
      return {
        ...state,
        phase: "work",
        currentRound: 1,
        phaseStartedAtMs: cursorStartMs,
        phaseEndsAtMs: cursorStartMs + roundMs,
      };
    }
    elapsedAfterPhaseMs -= roundMs;
    cursorStartMs += roundMs;

    if (totalRounds > 0 && nextRound >= totalRounds) {
      return {
        ...state,
        status: "idle",
        phase: "idle",
        currentRound: 0,
        phaseStartedAtMs: null,
        phaseEndsAtMs: null,
        remainingMsAtPause: null,
      };
    }

    nextPhase = "rest";
    if (elapsedAfterPhaseMs < restMs) {
      return {
        ...state,
        phase: "rest",
        currentRound: 1,
        phaseStartedAtMs: cursorStartMs,
        phaseEndsAtMs: cursorStartMs + restMs,
      };
    }
    elapsedAfterPhaseMs -= restMs;
    cursorStartMs += restMs;
    nextRound += 1;
    nextPhase = "work";
  } else if (nextPhase === "work") {
    if (totalRounds > 0 && nextRound >= totalRounds) {
      return {
        ...state,
        status: "idle",
        phase: "idle",
        currentRound: 0,
        phaseStartedAtMs: null,
        phaseEndsAtMs: null,
        remainingMsAtPause: null,
      };
    }
    if (elapsedAfterPhaseMs < restMs) {
      return {
        ...state,
        phase: "rest",
        currentRound: nextRound,
        phaseStartedAtMs: cursorStartMs,
        phaseEndsAtMs: cursorStartMs + restMs,
      };
    }
    elapsedAfterPhaseMs -= restMs;
    cursorStartMs += restMs;
    nextRound += 1;
    nextPhase = "work";
  } else if (nextPhase === "rest") {
    nextRound += 1;
    nextPhase = "work";
  }

  // Now we are aligned at the start of `work` for `nextRound` with `elapsedAfterPhaseMs >= 0`.
  if (totalRounds > 0 && nextRound > totalRounds) {
    return {
      ...state,
      status: "idle",
      phase: "idle",
      currentRound: 0,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: null,
    };
  }

  const cyclesSkipped = Math.floor(elapsedAfterPhaseMs / cycleMs);
  const inCycleMs = elapsedAfterPhaseMs % cycleMs;
  const landedRound = nextRound + cyclesSkipped;

  if (totalRounds > 0 && landedRound > totalRounds) {
    return {
      ...state,
      status: "idle",
      phase: "idle",
      currentRound: 0,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: null,
    };
  }

  const cycleStartMs = cursorStartMs + cyclesSkipped * cycleMs;

  if (inCycleMs < roundMs) {
    return {
      ...state,
      phase: "work",
      currentRound: landedRound,
      phaseStartedAtMs: cycleStartMs,
      phaseEndsAtMs: cycleStartMs + roundMs,
    };
  }

  if (totalRounds > 0 && landedRound >= totalRounds) {
    return {
      ...state,
      status: "idle",
      phase: "idle",
      currentRound: 0,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: null,
    };
  }

  const restStartMs = cycleStartMs + roundMs;
  return {
    ...state,
    phase: "rest",
    currentRound: landedRound,
    phaseStartedAtMs: restStartMs,
    phaseEndsAtMs: restStartMs + restMs,
  };
}

/**
 * Compute an immutable UI snapshot of the timer at `nowMs`.
 * @param {ReturnType<typeof createDefaultTimerState>} state
 * @param {number} [nowMs]
 */
export function computeTimerSnapshot(state, nowMs = Date.now()) {
  const normalized = normalizeTimerState(state, nowMs);

  if (normalized.status === "idle" || normalized.phase === "idle") {
    const idleDurationMs = normalized.roundDurationSec * 1000;
    return {
      status: "idle",
      phase: "idle",
      currentRound: 0,
      totalRounds: normalized.totalRounds,
      remainingMs: idleDurationMs,
      remainingSec: normalized.roundDurationSec,
      phaseDurationMs: idleDurationMs,
      progress: 0,
      label: "Ready",
      isEndingSoon: false,
      finishAtMs: computeFinishAtMs(normalized, nowMs),
    };
  }

  if (normalized.status === "paused") {
    const phaseDurationMs = getPhaseDurationMs(normalized, normalized.phase);
    const remainingMs = Math.max(
      0,
      Math.min(phaseDurationMs, normalized.remainingMsAtPause ?? phaseDurationMs)
    );
    const remainingSec = Math.ceil(remainingMs / 1000);
    return {
      status: "paused",
      phase: normalized.phase,
      currentRound: normalized.currentRound,
      totalRounds: normalized.totalRounds,
      remainingMs,
      remainingSec,
      phaseDurationMs,
      progress:
        phaseDurationMs > 0
          ? Math.min(1, Math.max(0, 1 - remainingMs / phaseDurationMs))
          : 0,
      label: formatPhaseLabel(
        normalized.phase,
        normalized.currentRound,
        normalized.totalRounds
      ),
      isEndingSoon:
        normalized.phase === "work" &&
        remainingSec > 0 &&
        remainingSec <= 10,
      finishAtMs: null,
    };
  }

  const resolved = resolveRunningPhase(normalized, nowMs);
  if (resolved.status === "idle" || resolved.phase === "idle") {
    const idleDurationMs = resolved.roundDurationSec * 1000;
    return {
      status: "idle",
      phase: "idle",
      currentRound: 0,
      totalRounds: resolved.totalRounds,
      remainingMs: idleDurationMs,
      remainingSec: resolved.roundDurationSec,
      phaseDurationMs: idleDurationMs,
      progress: 0,
      label: "Ready",
      isEndingSoon: false,
      finishAtMs: computeFinishAtMs(resolved, nowMs),
    };
  }

  const phaseDurationMs = getPhaseDurationMs(resolved, resolved.phase);
  const remainingMs = Math.max(0, (resolved.phaseEndsAtMs ?? nowMs) - nowMs);
  const remainingSec = Math.ceil(remainingMs / 1000);

  return {
    status: "running",
    phase: resolved.phase,
    currentRound: resolved.currentRound,
    totalRounds: resolved.totalRounds,
    remainingMs,
    remainingSec,
    phaseDurationMs,
    progress:
      phaseDurationMs > 0
        ? Math.min(1, Math.max(0, 1 - remainingMs / phaseDurationMs))
        : 0,
    label: formatPhaseLabel(
      resolved.phase,
      resolved.currentRound,
      resolved.totalRounds
    ),
    isEndingSoon:
      resolved.phase === "work" &&
      remainingSec > 0 &&
      remainingSec <= 10,
    finishAtMs: computeFinishAtMs(resolved, nowMs),
  };
}

/**
 * @param {"idle"|"ready"|"work"|"rest"} phase
 * @param {number} currentRound
 * @param {number} totalRounds
 */
export function formatPhaseLabel(phase, currentRound, totalRounds) {
  if (phase === "ready") return "Get Ready";
  if (phase === "work") {
    return totalRounds > 0
      ? `Round ${currentRound} / ${totalRounds}`
      : `Round ${currentRound}`;
  }
  if (phase === "rest") {
    return `Rest ${currentRound}`;
  }
  return "Ready";
}

/**
 * Compute the epoch ms when a finite-round session will finish.
 * Returns null for unlimited rounds (`totalRounds === 0`) or paused timers.
 * @param {ReturnType<typeof createDefaultTimerState>} state
 * @param {number} [nowMs]
 * @returns {number|null}
 */
export function computeFinishAtMs(state, nowMs = Date.now()) {
  const normalized = normalizeTimerState(state, nowMs);
  if (normalized.totalRounds <= 0) return null;

  const roundMs = normalized.roundDurationSec * 1000;
  const restMs = normalized.restDurationSec * 1000;
  const readyMs = (normalized.readyDurationSec ?? DEFAULT_READY_SEC) * 1000;

  if (normalized.status === "idle" || normalized.phase === "idle") {
    const totalMs =
      readyMs +
      normalized.totalRounds * roundMs +
      Math.max(0, normalized.totalRounds - 1) * restMs;
    return nowMs + totalMs;
  }

  if (normalized.status === "paused") {
    return null;
  }

  const resolved = resolveRunningPhase(normalized, nowMs);
  if (resolved.status === "idle" || resolved.phase === "idle") {
    return null;
  }

  const remainingCurrentMs = Math.max(0, (resolved.phaseEndsAtMs ?? nowMs) - nowMs);
  const roundsLeftAfterCurrent = Math.max(
    0,
    resolved.totalRounds - resolved.currentRound
  );

  if (resolved.phase === "ready") {
    return (
      nowMs +
      remainingCurrentMs +
      resolved.totalRounds * roundMs +
      Math.max(0, resolved.totalRounds - 1) * restMs
    );
  }

  if (resolved.phase === "work") {
    return (
      nowMs +
      remainingCurrentMs +
      roundsLeftAfterCurrent * (roundMs + restMs)
    );
  }

  if (resolved.phase === "rest") {
    return (
      nowMs +
      remainingCurrentMs +
      roundsLeftAfterCurrent * roundMs +
      Math.max(0, roundsLeftAfterCurrent - 1) * restMs
    );
  }

  return null;
}

/**
 * Apply a control command to the timer state and return the next state.
 * @param {ReturnType<typeof createDefaultTimerState>} state
 * @param {{ action?: string, type?: string, roundDurationSec?: number, restDurationSec?: number, totalRounds?: number, readyDurationSec?: number, presetId?: string, displayMode?: string, autoSwitchOnTimer?: boolean, popupMode?: string }} command
 * @param {number} [nowMs]
 */
export function applyTimerCommand(state, command, nowMs = Date.now()) {
  const current = resolveRunningPhase(normalizeTimerState(state, nowMs), nowMs);
  const action = command?.action || command?.type || "";

  const bump = (next) => ({
    ...next,
    updatedAtMs: nowMs,
    version: (current.version || 0) + 1,
  });

  if (action === "start") {
    if (current.status === "running") {
      return current;
    }

    const maybeSwitchedDisplay =
      current.autoSwitchOnTimer && current.displayMode === "check-in"
        ? "split"
        : current.displayMode;

    if (current.status === "paused" && current.phase !== "idle") {
      const phaseDurationMs = getPhaseDurationMs(current, current.phase);
      const remainingMs = Math.max(
        0,
        Math.min(phaseDurationMs, current.remainingMsAtPause ?? phaseDurationMs)
      );
      return bump({
        ...current,
        displayMode: maybeSwitchedDisplay,
        status: "running",
        phaseStartedAtMs: nowMs - (phaseDurationMs - remainingMs),
        phaseEndsAtMs: nowMs + remainingMs,
        remainingMsAtPause: null,
      });
    }

    const readyMs = (current.readyDurationSec ?? DEFAULT_READY_SEC) * 1000;
    const firstPhase = readyMs > 0 ? "ready" : "work";
    const firstDurationMs =
      firstPhase === "ready" ? readyMs : current.roundDurationSec * 1000;

    return bump({
      ...current,
      displayMode: maybeSwitchedDisplay,
      status: "running",
      phase: firstPhase,
      currentRound: 1,
      phaseStartedAtMs: nowMs,
      phaseEndsAtMs: nowMs + firstDurationMs,
      remainingMsAtPause: null,
    });
  }

  if (action === "pause") {
    if (current.status !== "running") {
      return current;
    }
    const remainingMs = Math.max(0, (current.phaseEndsAtMs ?? nowMs) - nowMs);
    return bump({
      ...current,
      status: "paused",
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: remainingMs,
    });
  }

  if (action === "toggle") {
    return current.status === "running"
      ? applyTimerCommand(current, { action: "pause" }, nowMs)
      : applyTimerCommand(current, { action: "start" }, nowMs);
  }

  if (action === "reset") {
    return bump({
      ...current,
      status: "idle",
      phase: "idle",
      currentRound: 0,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: null,
    });
  }

  if (action === "update_settings") {
    const roundDurationSec =
      command.roundDurationSec !== undefined
        ? clampInt(
            command.roundDurationSec,
            MIN_ROUND_SEC,
            MAX_ROUND_SEC,
            current.roundDurationSec
          )
        : current.roundDurationSec;

    const restDurationSec =
      command.restDurationSec !== undefined
        ? clampInt(
            command.restDurationSec,
            MIN_REST_SEC,
            MAX_REST_SEC,
            current.restDurationSec
          )
        : current.restDurationSec;

    const totalRounds =
      command.totalRounds !== undefined
        ? clampInt(
            command.totalRounds,
            MIN_TOTAL_ROUNDS,
            MAX_TOTAL_ROUNDS,
            current.totalRounds
          )
        : current.totalRounds;

    const readyDurationSec =
      command.readyDurationSec !== undefined
        ? clampInt(
            command.readyDurationSec,
            0,
            30,
            current.readyDurationSec
          )
        : current.readyDurationSec;

    const nextCandidate = {
      ...current,
      roundDurationSec,
      restDurationSec,
      totalRounds,
      readyDurationSec,
    };

    const matchedPreset = findMatchingPreset(nextCandidate);

    return bump({
      ...nextCandidate,
      activePresetId: matchedPreset ? matchedPreset.id : null,
    });
  }

  if (action === "apply_preset") {
    const preset = getPresetById(command.presetId);
    if (!preset) {
      return current;
    }
    return bump({
      ...current,
      roundDurationSec: preset.roundDurationSec,
      restDurationSec: preset.restDurationSec,
      totalRounds: preset.totalRounds,
      activePresetId: preset.id,
      status: "idle",
      phase: "idle",
      currentRound: 0,
      phaseStartedAtMs: null,
      phaseEndsAtMs: null,
      remainingMsAtPause: null,
    });
  }

  if (action === "set_display") {
    const displayMode = DISPLAY_MODES.includes(command.displayMode)
      ? command.displayMode
      : current.displayMode;
    const autoSwitchOnTimer =
      typeof command.autoSwitchOnTimer === "boolean"
        ? command.autoSwitchOnTimer
        : current.autoSwitchOnTimer;
    const popupMode = POPUP_MODES.includes(command.popupMode)
      ? command.popupMode
      : current.popupMode;

    return bump({
      ...current,
      displayMode,
      autoSwitchOnTimer,
      popupMode,
    });
  }

  return current;
}

/**
 * Format milliseconds as MM:SS countdown string.
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format a duration in seconds as M:SS (for control readouts).
 * @param {number} totalSec
 * @returns {string}
 */
export function formatDurationCompact(totalSec) {
  const safe = Math.max(0, Math.round(Number(totalSec) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format epoch ms or Date as gym wall-clock time (default Australia/Sydney).
 * @param {number|Date|null|undefined} value
 * @param {string} [timeZone]
 * @param {{ includeSeconds?: boolean }} [options]
 * @returns {string}
 */
export function formatClockTime(
  value,
  timeZone = GYM_TIME_ZONE,
  options = {}
) {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    ...(options.includeSeconds ? { second: "2-digit" } : {}),
    hour12: true,
    timeZone,
  });
}

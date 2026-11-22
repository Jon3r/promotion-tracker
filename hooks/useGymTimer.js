"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeTimerSnapshot,
  createDefaultTimerState,
  normalizeTimerState,
} from "@/lib/timer/engine";
import {
  isAudioUnlocked,
  playTimerCue,
  setAudioVolume,
  unlockAudio,
} from "@/lib/audio/timerAudio";

const PREFS_STORAGE_KEY = "bjj-gym-timer-prefs-v2";
const POLL_IDLE_MS = 1500;
const POLL_ACTIVE_MS = 500;
const SSE_BACKOFF_MIN_MS = 1000;
const SSE_BACKOFF_MAX_MS = 8000;

export const DEFAULT_TIMER_COLORS = {
  bg: "#1914a6",
  text: "#ffffff",
  clock: "#ffbe00",
  rest: "#ffffff",
  ending: "#ffffff",
};

const DEFAULT_PREFS = {
  volume: 85,
  checkInChime: true,
  colors: { ...DEFAULT_TIMER_COLORS },
  lastDurations: null,
};

function loadLocalPrefs() {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      volume: Number.isFinite(Number(parsed?.volume))
        ? Math.min(100, Math.max(0, Math.round(Number(parsed.volume))))
        : DEFAULT_PREFS.volume,
      checkInChime:
        typeof parsed?.checkInChime === "boolean"
          ? parsed.checkInChime
          : DEFAULT_PREFS.checkInChime,
      colors: {
        ...DEFAULT_TIMER_COLORS,
        ...(parsed?.colors && typeof parsed.colors === "object"
          ? parsed.colors
          : {}),
      },
      lastDurations: parsed?.lastDurations || null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveLocalPrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Shared synchronized timer hook backed by /api/timer/stream + adaptive polling.
 * @param {{ enableAudio?: boolean }} [options]
 */
export function useGymTimer(options = {}) {
  const { enableAudio = false } = options;

  const [serverState, setServerState] = useState(() =>
    createDefaultTimerState()
  );
  const [hasServerSync, setHasServerSync] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [storageMode, setStorageMode] = useState("memory");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastSyncedAtMs, setLastSyncedAtMs] = useState(0);

  const lastMutationSeqRef = useRef(0);
  const seededAudioRef = useRef(false);
  const prevAudioSnapRef = useRef(null);
  const serverStatusRef = useRef("idle");
  const syncErrorRef = useRef("");

  // Load persisted local preferences asynchronously after mount
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const loaded = loadLocalPrefs();
      setPrefs(loaded);
      setAudioVolume(loaded.volume);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep audio master volume & CSS color vars in sync with prefs
  useEffect(() => {
    setAudioVolume(prefs.volume);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--timer-bg", prefs.colors.bg);
      root.style.setProperty("--timer-text", prefs.colors.text);
      root.style.setProperty("--timer-clock", prefs.colors.clock);
      root.style.setProperty("--timer-rest", prefs.colors.rest);
      root.style.setProperty("--timer-ending", prefs.colors.ending);
    }
  }, [prefs]);

  useEffect(() => {
    serverStatusRef.current = serverState.status;
  }, [serverState.status]);

  useEffect(() => {
    syncErrorRef.current = syncError;
  }, [syncError]);

  const applyServerPayload = useCallback((payload) => {
    if (!payload?.state) return;
    const normalized = normalizeTimerState(payload.state);
    if (Number.isFinite(payload.serverNowMs)) {
      setClockOffsetMs(payload.serverNowMs - Date.now());
    }
    if (payload.storage) {
      setStorageMode(payload.storage);
    }
    setServerState((prev) => {
      // Avoid regressing to an older version from an out-of-order poll
      if (
        prev &&
        normalized.updatedAtMs < prev.updatedAtMs &&
        normalized.version <= prev.version
      ) {
        return prev;
      }
      return normalized;
    });
    setHasServerSync(true);
    setSyncError("");
    setConnectionStatus("connected");
    setLastSyncedAtMs(Date.now());
  }, []);

  // Initial fetch + SSE stream with reconnect + adaptive polling
  useEffect(() => {
    let cancelled = false;
    let eventSource = null;
    let pollId = null;
    let reconnectTimeoutId = null;
    let sseBackoffMs = SSE_BACKOFF_MIN_MS;

    async function fetchTimer() {
      const requestSeq = lastMutationSeqRef.current;
      try {
        const res = await fetch("/api/timer", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.state) {
          setSyncError(data?.error || "Could not sync timer");
          setConnectionStatus("reconnecting");
          return;
        }
        // Skip if a newer local mutation started while this GET was in flight
        if (requestSeq !== lastMutationSeqRef.current) return;
        applyServerPayload(data);
      } catch {
        if (!cancelled) {
          setSyncError("Connection lost — retrying…");
          setConnectionStatus("reconnecting");
        }
      }
    }

    function closeEventSource() {
      if (eventSource) {
        eventSource.onerror = null;
        eventSource.close();
        eventSource = null;
      }
    }

    function scheduleSseReconnect() {
      if (cancelled || reconnectTimeoutId) return;
      setConnectionStatus("reconnecting");
      reconnectTimeoutId = setTimeout(() => {
        reconnectTimeoutId = null;
        openEventSource();
      }, sseBackoffMs);
      sseBackoffMs = Math.min(SSE_BACKOFF_MAX_MS, sseBackoffMs * 2);
    }

    function openEventSource() {
      if (cancelled || typeof EventSource === "undefined") return;
      closeEventSource();
      try {
        eventSource = new EventSource("/api/timer/stream");
        eventSource.addEventListener("state", (event) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse(event.data);
            sseBackoffMs = SSE_BACKOFF_MIN_MS;
            applyServerPayload(payload);
          } catch {
            // Ignore malformed SSE payloads
          }
        });
        eventSource.onerror = () => {
          if (cancelled) return;
          closeEventSource();
          scheduleSseReconnect();
        };
      } catch {
        scheduleSseReconnect();
      }
    }

    function clearPoll() {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    }

    function startPoll(intervalMs) {
      clearPoll();
      pollId = setInterval(fetchTimer, intervalMs);
    }

    function resyncNow() {
      if (cancelled) return;
      fetchTimer();
      openEventSource();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        resyncNow();
      }
    }

    function onPageShow() {
      resyncNow();
    }

    function onOnline() {
      resyncNow();
    }

    fetchTimer();
    openEventSource();

    let lastPollMs =
      serverStatusRef.current === "running" || syncErrorRef.current
        ? POLL_ACTIVE_MS
        : POLL_IDLE_MS;
    startPoll(lastPollMs);

    // Adapt poll rate when timer starts/stops or sync errors appear
    const pollAdaptId = setInterval(() => {
      if (cancelled) return;
      const desired =
        serverStatusRef.current === "running" || syncErrorRef.current
          ? POLL_ACTIVE_MS
          : POLL_IDLE_MS;
      if (desired !== lastPollMs) {
        lastPollMs = desired;
        startPoll(desired);
      }
    }, 400);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearPoll();
      clearInterval(pollAdaptId);
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      closeEventSource();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
    };
  }, [applyServerPayload]);

  // Smooth 100ms clock tick for countdown and wall-clock updates
  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Auto-unlock audio for Chromium kiosk and first user interaction
  useEffect(() => {
    if (!enableAudio) return undefined;
    let cancelled = false;

    const tryUnlock = async () => {
      const ok = await unlockAudio();
      if (!cancelled) {
        setAudioUnlocked(ok || isAudioUnlocked());
      }
    };

    tryUnlock();

    const onGesture = () => {
      tryUnlock();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [enableAudio]);

  const syncedNowMs = nowMs + clockOffsetMs;

  const snapshot = useMemo(
    () => computeTimerSnapshot(serverState, syncedNowMs),
    [serverState, syncedNowMs]
  );

  // Trigger audio cues on TV display when phases/seconds cross thresholds
  useEffect(() => {
    if (!enableAudio || !hasServerSync) return;

    if (!seededAudioRef.current) {
      seededAudioRef.current = true;
      prevAudioSnapRef.current = {
        status: snapshot.status,
        phase: snapshot.phase,
        currentRound: snapshot.currentRound,
        remainingSec: snapshot.remainingSec,
      };
      return;
    }

    const prev = prevAudioSnapRef.current;
    prevAudioSnapRef.current = {
      status: snapshot.status,
      phase: snapshot.phase,
      currentRound: snapshot.currentRound,
      remainingSec: snapshot.remainingSec,
    };

    if (!prev) return;

    if (snapshot.status === "running") {
      if (snapshot.phase === "ready") {
        if (prev.phase !== "ready") {
          playTimerCue("ready", { announce: true });
        } else if (
          snapshot.remainingSec !== prev.remainingSec &&
          snapshot.remainingSec > 0
        ) {
          playTimerCue("ready");
        }
      } else if (
        snapshot.phase === "work" &&
        (prev.phase !== "work" || prev.currentRound !== snapshot.currentRound)
      ) {
        const isFinal =
          serverState.totalRounds > 0 &&
          snapshot.currentRound === serverState.totalRounds;
        playTimerCue("start", {
          announce: true,
          round: snapshot.currentRound,
          isFinal,
        });
      } else if (snapshot.phase === "rest" && prev.phase !== "rest") {
        playTimerCue("finish");
      } else if (
        snapshot.phase === "work" &&
        prev.phase === "work" &&
        prev.remainingSec > 10 &&
        snapshot.remainingSec <= 10 &&
        snapshot.remainingSec > 0 &&
        serverState.roundDurationSec > 15
      ) {
        playTimerCue("soon", { announce: true });
      }
    } else if (
      prev.status === "running" &&
      prev.phase === "work" &&
      snapshot.status === "idle" &&
      serverState.status === "running"
    ) {
      // Natural completion at end of final round
      playTimerCue("finish");
    }
  }, [
    enableAudio,
    hasServerSync,
    snapshot.status,
    snapshot.phase,
    snapshot.currentRound,
    snapshot.remainingSec,
    serverState.roundDurationSec,
    serverState.totalRounds,
    serverState.status,
  ]);

  const updatePrefs = useCallback((updater) => {
    setPrefs((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      saveLocalPrefs(next);
      return next;
    });
  }, []);

  const resetColors = useCallback(() => {
    updatePrefs((prev) => ({
      ...prev,
      colors: { ...DEFAULT_TIMER_COLORS },
    }));
  }, [updatePrefs]);

  const handleUnlockAudio = useCallback(async () => {
    const ok = await unlockAudio();
    setAudioUnlocked(ok || isAudioUnlocked());
    return ok;
  }, []);

  const testBell = useCallback(async () => {
    await handleUnlockAudio();
    return playTimerCue("start", { announce: true, round: 1 });
  }, [handleUnlockAudio]);

  const playCheckInChime = useCallback(() => {
    if (!enableAudio || !prefs.checkInChime) return;
    playTimerCue("checkin");
  }, [enableAudio, prefs.checkInChime]);

  const sendCommand = useCallback(
    async (action, payload = {}) => {
      lastMutationSeqRef.current += 1;
      const body = JSON.stringify({ action, ...payload });

      const postOnce = async () => {
        const res = await fetch("/api/timer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json();
        if (!res.ok || !data?.state) {
          return {
            ok: false,
            error: data?.error || "Could not update timer",
          };
        }
        return { ok: true, data };
      };

      const applySuccess = (data) => {
        applyServerPayload(data);
        if (action === "update_settings" || action === "apply_preset") {
          updatePrefs((prev) => ({
            ...prev,
            lastDurations: {
              roundDurationSec: data.state.roundDurationSec,
              restDurationSec: data.state.restDurationSec,
              totalRounds: data.state.totalRounds,
            },
          }));
        }
        return { ok: true, state: data.state };
      };

      try {
        const first = await postOnce();
        if (first.ok) return applySuccess(first.data);
        setSyncError(first.error);
        setConnectionStatus("reconnecting");
        return { ok: false, error: first.error };
      } catch {
        // One automatic retry on network failure
        try {
          await new Promise((r) => setTimeout(r, 350));
          const second = await postOnce();
          if (second.ok) return applySuccess(second.data);
          setSyncError(second.error);
          setConnectionStatus("reconnecting");
          return { ok: false, error: second.error };
        } catch {
          const error = "Network error sending timer command";
          setSyncError(error);
          setConnectionStatus("reconnecting");
          return { ok: false, error };
        }
      }
    },
    [applyServerPayload, updatePrefs]
  );

  return {
    state: serverState,
    snapshot,
    nowMs: syncedNowMs,
    hasServerSync,
    storageMode,
    syncError,
    connectionStatus,
    lastSyncedAtMs,
    prefs,
    updatePrefs,
    resetColors,
    audioUnlocked,
    unlockAudio: handleUnlockAudio,
    testBell,
    playCheckInChime,
    sendCommand,
  };
}

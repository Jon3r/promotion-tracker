import { describe, expect, it } from "vitest";
import {
  applyTimerCommand,
  computeFinishAtMs,
  computeTimerSnapshot,
  createDefaultTimerState,
  formatClockTime,
  formatCountdown,
  MIN_REST_SEC,
  MIN_ROUND_SEC,
} from "./engine";

describe("timer engine", () => {
  it("initializes with expected defaults (5:00 work, 0:20 rest, unlimited)", () => {
    const state = createDefaultTimerState({}, 1_000_000);
    expect(state.roundDurationSec).toBe(300);
    expect(state.restDurationSec).toBe(20);
    expect(state.totalRounds).toBe(0);
    expect(state.readyDurationSec).toBe(10);
    expect(state.status).toBe("idle");
    expect(state.phase).toBe("idle");
    expect(state.displayMode).toBe("split");
    expect(state.activePresetId).toBe("standard");

    const snap = computeTimerSnapshot(state, 1_000_000);
    expect(snap.remainingSec).toBe(300);
    expect(formatCountdown(snap.remainingMs)).toBe("05:00");
    expect(snap.finishAtMs).toBeNull();
  });

  it("transitions cleanly through ready -> work -> rest -> work -> idle for finite rounds", () => {
    const t0 = 1_000_000;
    let state = createDefaultTimerState(
      {
        roundDurationSec: 60,
        restDurationSec: 15,
        totalRounds: 2,
        readyDurationSec: 3,
      },
      t0
    );

    state = applyTimerCommand(state, { action: "start" }, t0);
    expect(state.status).toBe("running");
    expect(state.phase).toBe("ready");
    expect(state.currentRound).toBe(1);

    // During Get Ready (t0 + 1.2s -> 1.8s left -> ceil 2s)
    let snap = computeTimerSnapshot(state, t0 + 1200);
    expect(snap.phase).toBe("ready");
    expect(snap.label).toBe("Get Ready");
    expect(snap.remainingSec).toBe(2);

    // Enters Round 1 at t0 + 3s
    snap = computeTimerSnapshot(state, t0 + 3000);
    expect(snap.phase).toBe("work");
    expect(snap.currentRound).toBe(1);
    expect(snap.label).toBe("Round 1 / 2");
    expect(snap.remainingSec).toBe(60);

    // 9s left in Round 1 -> isEndingSoon true
    snap = computeTimerSnapshot(state, t0 + 3000 + 51_000);
    expect(snap.phase).toBe("work");
    expect(snap.remainingSec).toBe(9);
    expect(snap.isEndingSoon).toBe(true);

    // Enters Rest 1 at t0 + 3s + 60s
    snap = computeTimerSnapshot(state, t0 + 63_000);
    expect(snap.phase).toBe("rest");
    expect(snap.currentRound).toBe(1);
    expect(snap.label).toBe("Rest 1");
    expect(snap.remainingSec).toBe(15);

    // Enters Round 2 at t0 + 3s + 60s + 15s = t0 + 78s
    snap = computeTimerSnapshot(state, t0 + 78_000);
    expect(snap.phase).toBe("work");
    expect(snap.currentRound).toBe(2);
    expect(snap.label).toBe("Round 2 / 2");
    expect(snap.remainingSec).toBe(60);

    // Completes after Round 2 ends (no trailing rest) at t0 + 78s + 60s = t0 + 138s
    snap = computeTimerSnapshot(state, t0 + 138_000);
    expect(snap.status).toBe("idle");
    expect(snap.phase).toBe("idle");
    expect(snap.currentRound).toBe(0);
  });

  it("supports unlimited rounds across many cycles", () => {
    const t0 = 5_000_000;
    let state = createDefaultTimerState(
      {
        roundDurationSec: 300,
        restDurationSec: 20,
        totalRounds: 0,
        readyDurationSec: 3,
      },
      t0
    );
    state = applyTimerCommand(state, { action: "start" }, t0);

    // 10 rounds = 10 * 320s = 3200s after ready (3s) -> inside Round 11
    const snap = computeTimerSnapshot(state, t0 + 3000 + 3200 * 1000 + 5000);
    expect(snap.status).toBe("running");
    expect(snap.phase).toBe("work");
    expect(snap.currentRound).toBe(11);
    expect(snap.label).toBe("Round 11");
    expect(snap.remainingSec).toBe(295);
    expect(snap.finishAtMs).toBeNull();
  });

  it("pauses and resumes accurately preserving remaining phase time", () => {
    const t0 = 2_000_000;
    let state = createDefaultTimerState(
      { roundDurationSec: 120, restDurationSec: 30, totalRounds: 3, readyDurationSec: 3 },
      t0
    );
    state = applyTimerCommand(state, { action: "start" }, t0);

    // Pause 15s into Round 1 (t0 + 3s + 15s = t0 + 18s)
    state = applyTimerCommand(state, { action: "pause" }, t0 + 18_000);
    expect(state.status).toBe("paused");
    expect(state.phase).toBe("work");
    expect(state.currentRound).toBe(1);
    expect(state.remainingMsAtPause).toBe(105_000);

    // Wait 40 seconds while paused
    let snap = computeTimerSnapshot(state, t0 + 58_000);
    expect(snap.status).toBe("paused");
    expect(snap.remainingSec).toBe(105);

    // Resume at t0 + 58s
    state = applyTimerCommand(state, { action: "toggle" }, t0 + 58_000);
    expect(state.status).toBe("running");
    expect(state.phase).toBe("work");
    expect(state.phaseEndsAtMs).toBe(t0 + 58_000 + 105_000);

    // 5 seconds later: 100s left
    snap = computeTimerSnapshot(state, t0 + 63_000);
    expect(snap.remainingSec).toBe(100);
  });

  it("calculates finite finish time accurately across idle and active phases", () => {
    const t0 = 10_000_000;
    let state = createDefaultTimerState(
      { roundDurationSec: 300, restDurationSec: 60, totalRounds: 6, readyDurationSec: 3 },
      t0
    );

    // Idle: 3 + 6*300 + 5*60 = 3 + 1800 + 300 = 2103s
    expect(computeFinishAtMs(state, t0)).toBe(t0 + 2103_000);

    state = applyTimerCommand(state, { action: "start" }, t0);
    // Still at t0 in ready: finish time unchanged
    expect(computeFinishAtMs(state, t0)).toBe(t0 + 2103_000);

    // Halfway through Round 1 (at t0 + 153s): still finishes at t0 + 2103s
    expect(computeFinishAtMs(state, t0 + 153_000)).toBe(t0 + 2103_000);

    // During Rest 1 (at t0 + 320s): still finishes at t0 + 2103s
    expect(computeFinishAtMs(state, t0 + 320_000)).toBe(t0 + 2103_000);
  });

  it("clamps minimum settings and applies presets and display commands", () => {
    const t0 = 1_000_000;
    let state = createDefaultTimerState({}, t0);

    state = applyTimerCommand(
      state,
      { action: "update_settings", roundDurationSec: 5, restDurationSec: 1, totalRounds: -3 },
      t0 + 100
    );
    expect(state.roundDurationSec).toBe(MIN_ROUND_SEC);
    expect(state.restDurationSec).toBe(MIN_REST_SEC);
    expect(state.totalRounds).toBe(0);

    state = applyTimerCommand(
      state,
      { action: "apply_preset", presetId: "comp" },
      t0 + 200
    );
    expect(state.roundDurationSec).toBe(360);
    expect(state.restDurationSec).toBe(60);
    expect(state.totalRounds).toBe(6);
    expect(state.activePresetId).toBe("comp");

    state = applyTimerCommand(
      state,
      {
        action: "set_display",
        displayMode: "check-in",
        autoSwitchOnTimer: true,
        popupMode: "toast",
      },
      t0 + 300
    );
    expect(state.displayMode).toBe("check-in");
    expect(state.autoSwitchOnTimer).toBe(true);
    expect(state.popupMode).toBe("toast");

    // Starting while in check-in with autoSwitchOnTimer switches to split
    state = applyTimerCommand(state, { action: "start" }, t0 + 400);
    expect(state.displayMode).toBe("split");
  });

  it("formats countdown and Sydney clock time", () => {
    expect(formatCountdown(300_000)).toBe("05:00");
    expect(formatCountdown(19_100)).toBe("00:20");
    expect(formatCountdown(0)).toBe("00:00");

    // 2026-01-15T08:30:00Z is 7:30 pm AEDT (UTC+11) in Australia/Sydney
    const formatted = formatClockTime(Date.parse("2026-01-15T08:30:00.000Z"), "Australia/Sydney");
    expect(formatted.toLowerCase()).toContain("7:30");
  });
});

"use client";

import {
  Infinity as InfinityIcon,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  formatClockTime,
  formatCountdown,
  formatDurationCompact,
  GYM_TIME_ZONE,
  MIN_REST_SEC,
  MIN_ROUND_SEC,
  REST_STEP_SEC,
  ROUND_STEP_SEC,
} from "@/lib/timer/engine";
import { TIMER_PRESETS } from "@/lib/timer/presets";

/**
 * TV-scale BJJ Round Timer modeled on bjj-timer.com.
 * @param {{
 *   timer: ReturnType<typeof import("@/hooks/useGymTimer").useGymTimer>,
 *   compact?: boolean
 * }} props
 */
export default function RoundTimer({ timer, compact = false }) {
  const {
    state,
    snapshot,
    nowMs,
    audioUnlocked,
    unlockAudio,
    sendCommand,
    syncError,
  } = timer;

  const isRunning = snapshot.status === "running";
  const isPaused = snapshot.status === "paused";
  const isIdle = snapshot.status === "idle";

  const clockColor =
    snapshot.phase === "rest"
      ? "var(--timer-rest, #ffffff)"
      : snapshot.phase === "ready"
        ? "var(--timer-clock, #ffbe00)"
        : snapshot.isEndingSoon
          ? "var(--timer-ending, #ffffff)"
          : "var(--timer-clock, #ffbe00)";

  const phaseBadgeClass =
    snapshot.phase === "rest"
      ? "border-white/50 bg-white/15 text-white"
      : snapshot.phase === "ready"
        ? "border-brand-gold/50 bg-brand-gold/20 text-brand-gold"
        : snapshot.isEndingSoon
          ? "border-white bg-white/20 text-white"
          : snapshot.phase === "work"
            ? "border-brand-gold/50 bg-brand-gold/15 text-brand-gold"
            : "border-white/30 bg-white/10 text-white";

  const statusText =
    snapshot.phase === "idle"
      ? "Ready"
      : isPaused
        ? `${snapshot.label} · Paused`
        : snapshot.label;

  const adjustRound = (delta) => {
    const next = Math.max(MIN_ROUND_SEC, state.roundDurationSec + delta);
    sendCommand("update_settings", { roundDurationSec: next });
  };

  const adjustRest = (delta) => {
    const next = Math.max(MIN_REST_SEC, state.restDurationSec + delta);
    sendCommand("update_settings", { restDurationSec: next });
  };

  const adjustRounds = (delta) => {
    const next = Math.max(0, state.totalRounds + delta);
    sendCommand("update_settings", { totalRounds: next });
  };

  const finishLabel = snapshot.finishAtMs
    ? `Finish at ${formatClockTime(snapshot.finishAtMs, GYM_TIME_ZONE)}`
    : state.totalRounds === 0
      ? "Unlimited rounds"
      : isPaused
        ? "Paused"
        : "";

  return (
    <section
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden select-none ${
        compact ? "px-5 py-5 sm:px-7 sm:py-6" : "min-h-screen px-6 py-6 sm:px-10 sm:py-8"
      }`}
      style={{
        backgroundColor: "var(--timer-bg, #1914a6)",
        color: "var(--timer-text, #ffffff)",
      }}
    >
      {/* Top status bar: Sydney wall clock & audio unlock prompt */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-10 sm:pt-0">
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-semibold tracking-tight tabular-nums text-white sm:text-2xl"
            suppressHydrationWarning
          >
            {formatClockTime(nowMs, GYM_TIME_ZONE)}
          </span>
          {syncError && (
            <span className="rounded-full border border-white/40 bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
              {syncError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 lg:pr-[26rem]">
          {!audioUnlocked ? (
            <button
              type="button"
              onClick={unlockAudio}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/70 bg-brand-gold/20 px-3 py-1.5 text-xs font-semibold text-brand-gold transition hover:bg-brand-gold/30"
            >
              <VolumeX className="h-3.5 w-3.5" />
              Tap to enable bell audio
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
              <Volume2 className="h-3.5 w-3.5 text-brand-gold" />
              Audio ready
            </span>
          )}
        </div>
      </div>

      {/* Center hero: phase banner + huge countdown + progress bar */}
      <div className="my-auto flex flex-col items-center justify-center py-4 text-center">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-5 py-1.5 text-sm font-bold uppercase tracking-[0.2em] sm:text-lg ${phaseBadgeClass}`}
        >
          <span>{statusText}</span>
        </div>

        <div
          className={`mt-3 font-bold leading-none tracking-tight tabular-nums transition-colors duration-200 ${
            snapshot.isEndingSoon && isRunning ? "timer-ending-soon" : ""
          }`}
          style={{
            color: clockColor,
            fontSize: compact
              ? "clamp(4.5rem, 11.5vw, 11rem)"
              : "clamp(5.25rem, 19vw, 17rem)",
          }}
        >
          {formatCountdown(snapshot.remainingMs)}
        </div>

        {/* Thin phase progress bar */}
        <div className="mt-4 h-2 w-full max-w-2xl overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full transition-[width] duration-150 ease-linear"
            style={{
              width: `${Math.round(snapshot.progress * 100)}%`,
              backgroundColor: clockColor,
            }}
          />
        </div>

        {finishLabel && (
          <p
            className="mt-3 text-sm font-medium tracking-wide text-white sm:text-lg"
            suppressHydrationWarning
          >
            {finishLabel}
          </p>
        )}
      </div>

      {/* Bottom controls: Start/Pause/Reset + Duration/Rest/Rounds + Presets */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {/* Primary transport controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              sendCommand("toggle");
            }}
            className={`inline-flex min-w-[11rem] items-center justify-center gap-2.5 rounded-2xl px-7 py-3.5 text-lg font-bold shadow-lg transition active:scale-[0.98] sm:py-4 sm:text-xl ${
              isRunning
                ? "bg-white text-brand-blue hover:bg-white/90"
                : "bg-brand-gold text-brand-blue hover:bg-brand-gold-hover"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 fill-current" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                {isPaused ? "Resume" : "Start"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => sendCommand("reset")}
            disabled={isIdle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/50 bg-white/10 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-40 sm:py-4 sm:text-lg"
          >
            <RotateCcw className="h-5 w-5" />
            Reset
          </button>
        </div>

        {/* Stepper cards: Duration, Rest, Rounds */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-white/25 bg-white/10 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Round
              </p>
              <p className="text-lg font-bold tabular-nums text-brand-gold sm:text-xl">
                {formatDurationCompact(state.roundDurationSec)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease round duration by 30 seconds"
                onClick={() => adjustRound(-ROUND_STEP_SEC)}
                disabled={state.roundDurationSec <= MIN_ROUND_SEC}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Increase round duration by 30 seconds"
                onClick={() => adjustRound(ROUND_STEP_SEC)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/25 bg-white/10 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Rest
              </p>
              <p className="text-lg font-bold tabular-nums text-white sm:text-xl">
                {formatDurationCompact(state.restDurationSec)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease rest duration by 10 seconds"
                onClick={() => adjustRest(-REST_STEP_SEC)}
                disabled={state.restDurationSec <= MIN_REST_SEC}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Increase rest duration by 10 seconds"
                onClick={() => adjustRest(REST_STEP_SEC)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/25 bg-white/10 px-3 py-2.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                Rounds
              </p>
              <p className="flex items-center gap-1 text-lg font-bold tabular-nums text-white sm:text-xl">
                {state.totalRounds === 0 ? (
                  <>
                    <InfinityIcon className="h-5 w-5" />
                    <span className="text-sm font-medium text-white">
                      Unlimited
                    </span>
                  </>
                ) : (
                  state.totalRounds
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Decrease rounds"
                onClick={() => adjustRounds(-1)}
                disabled={state.totalRounds <= 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-35"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Increase rounds"
                onClick={() => adjustRounds(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Preset Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {TIMER_PRESETS.map((preset) => {
            const active = state.activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => sendCommand("apply_preset", { presetId: preset.id })}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "border-brand-gold bg-brand-gold text-brand-blue"
                    : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {preset.name}
                <span
                  className={`ml-1.5 text-[11px] ${
                    active ? "text-brand-blue/80" : "text-white/70"
                  }`}
                >
                  {formatDurationCompact(preset.roundDurationSec)}/
                  {formatDurationCompact(preset.restDurationSec)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

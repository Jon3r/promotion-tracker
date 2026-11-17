"use client";

import Link from "next/link";
import {
  Columns2,
  Infinity as InfinityIcon,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer as TimerIcon,
  Tv,
  Users,
} from "lucide-react";
import { useGymTimer } from "@/hooks/useGymTimer";
import { useClubWorxCheckIn } from "@/hooks/useClubWorxCheckIn";
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

export default function RemotePage() {
  const timer = useGymTimer({ enableAudio: false });
  const checkIn = useClubWorxCheckIn();

  const { state, snapshot, nowMs, sendCommand, syncError } = timer;
  const isRunning = snapshot.status === "running";
  const isPaused = snapshot.status === "paused";
  const isIdle = snapshot.status === "idle";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-brand-blue px-4 py-5 text-white">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold">
            Parramatta Jiu Jitsu
          </p>
          <h1 className="text-xl font-bold text-white">Coach Mat Remote</h1>
        </div>
        <Link
          href="/gym"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          <Tv className="h-3.5 w-3.5" />
          TV View
        </Link>
      </header>

      {syncError && (
        <p
          className="rounded-xl border border-white/40 bg-white/15 px-3 py-2 text-xs text-brand-gold"
          role="alert"
        >
          {syncError}
        </p>
      )}

      {/* Live Mirrored Timer Card */}
      <section className="rounded-2xl border border-white/25 bg-white/10 p-4 text-center shadow-lg">
        <div className="flex items-center justify-between text-xs text-white/75">
          <span className="font-semibold uppercase tracking-wider text-brand-gold">
            {snapshot.phase === "idle"
              ? "Ready"
              : isPaused
                ? `${snapshot.label} · Paused`
                : snapshot.label}
          </span>
          <span className="tabular-nums" suppressHydrationWarning>
            {formatClockTime(nowMs, GYM_TIME_ZONE)}
          </span>
        </div>

        <p
          className={`mt-2 text-6xl font-bold tracking-tight tabular-nums ${
            snapshot.phase === "rest"
              ? "text-white"
              : snapshot.isEndingSoon
                ? "text-white timer-ending-soon"
                : "text-brand-gold"
          }`}
        >
          {formatCountdown(snapshot.remainingMs)}
        </p>

        {snapshot.finishAtMs && (
          <p className="mt-1 text-xs text-white/75" suppressHydrationWarning>
            Finish at {formatClockTime(snapshot.finishAtMs, GYM_TIME_ZONE)}
          </p>
        )}

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2.5">
          <button
            type="button"
            onClick={() => sendCommand("toggle")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold transition active:scale-[0.98] ${
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
            aria-label="Reset timer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-35"
          >
            <RotateCcw className="h-5 w-5" />
            Reset
          </button>
        </div>
      </section>

      {/* Round / Rest / Rounds Steppers */}
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Round
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
            {formatDurationCompact(state.roundDurationSec)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-label="Decrease round duration"
              onClick={() => adjustRound(-ROUND_STEP_SEC)}
              disabled={state.roundDurationSec <= MIN_ROUND_SEC}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25 disabled:opacity-35"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Increase round duration"
              onClick={() => adjustRound(ROUND_STEP_SEC)}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Rest
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
            {formatDurationCompact(state.restDurationSec)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-label="Decrease rest duration"
              onClick={() => adjustRest(-REST_STEP_SEC)}
              disabled={state.restDurationSec <= MIN_REST_SEC}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25 disabled:opacity-35"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Increase rest duration"
              onClick={() => adjustRest(REST_STEP_SEC)}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 p-2.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Rounds
          </p>
          <p className="mt-0.5 flex h-7 items-center justify-center text-lg font-bold tabular-nums text-white">
            {state.totalRounds === 0 ? (
              <InfinityIcon className="h-5 w-5" />
            ) : (
              state.totalRounds
            )}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-label="Decrease rounds"
              onClick={() => adjustRounds(-1)}
              disabled={state.totalRounds <= 0}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25 disabled:opacity-35"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Increase rounds"
              onClick={() => adjustRounds(1)}
              className="flex h-10 items-center justify-center rounded-lg bg-white/10 text-white active:bg-white/25"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Presets */}
      <section className="rounded-2xl border border-white/10 bg-white/10 p-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Presets
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {TIMER_PRESETS.map((preset) => {
            const active = state.activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  sendCommand("apply_preset", { presetId: preset.id })
                }
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-brand-gold bg-brand-gold text-brand-blue"
                    : "border-white/10 bg-white/5 text-white active:bg-white/15"
                }`}
              >
                <p className="text-sm font-bold">{preset.name}</p>
                <p
                  className={`text-[11px] ${
                    active ? "text-brand-blue/80" : "text-white/70"
                  }`}
                >
                  {formatDurationCompact(preset.roundDurationSec)} /{" "}
                  {formatDurationCompact(preset.restDurationSec)} ·{" "}
                  {preset.totalRounds === 0 ? "∞" : `${preset.totalRounds}r`}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* TV Screen Mode Switcher */}
      <section className="rounded-2xl border border-white/10 bg-white/10 p-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          TV Screen Mode
        </h2>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[
            { id: "split", label: "Split", Icon: Columns2 },
            { id: "timer", label: "Timer", Icon: TimerIcon },
            { id: "check-in", label: "Check-In", Icon: Users },
          ].map(({ id, label, Icon }) => {
            const active = state.displayMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  sendCommand("set_display", { displayMode: id })
                }
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition ${
                  active
                    ? "border-brand-gold bg-brand-gold text-brand-blue"
                    : "border-white/25 bg-white/10 text-white active:bg-white/20"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Live ClubWorx Class & Check-In Count */}
      <section className="rounded-2xl border border-white/10 bg-white/10 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70">
            ClubWorx Class
          </h2>
          <span className="text-xs font-semibold text-brand-gold">
            {checkIn.statusLabel}
          </span>
        </div>

        {checkIn.scheduleLoading ? (
          <p className="mt-2 text-sm text-white/70">Loading schedule…</p>
        ) : checkIn.scheduleError ? (
          <p className="mt-2 text-xs text-brand-gold">{checkIn.scheduleError}</p>
        ) : checkIn.currentClasses?.length ? (
          <div className="mt-2 space-y-2">
            {checkIn.currentClasses.map((cls) => {
              const board = checkIn.classBoards?.find(
                (entry) =>
                  entry.classInfo.id === cls.id &&
                  entry.classInfo.startsAt === cls.startsAt
              );
              const count = board?.attendees.length ?? 0;
              return (
                <div
                  key={`${cls.id}-${cls.startsAt || ""}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-white">
                      {cls.title}
                    </p>
                    <p className="text-xs text-white/70">
                      {checkIn.formatTimeLabel(cls.startsAt)}
                      {cls.endsAt
                        ? ` – ${checkIn.formatTimeLabel(cls.endsAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-white bg-brand-gold px-3 py-2 text-center text-brand-blue">
                    <p className="text-xl font-bold tabular-nums">
                      {count}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider">
                      Checked in
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/80">
            {checkIn.nextClass
              ? `Next: ${checkIn.nextClass.title} at ${checkIn.formatTimeLabel(checkIn.nextClass.startsAt)}`
              : "No active class right now"}
          </p>
        )}
      </section>
    </main>
  );
}

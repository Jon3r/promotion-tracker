"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Bell,
  Columns2,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  Timer as TimerIcon,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { TIMER_PRESETS } from "@/lib/timer/presets";
import { formatDurationCompact } from "@/lib/timer/engine";

const COLOR_FIELDS = [
  { key: "bg", label: "Background" },
  { key: "text", label: "Text" },
  { key: "clock", label: "Work Clock" },
  { key: "rest", label: "Rest Clock" },
  { key: "ending", label: "10s Warning" },
];

/**
 * Slide-over settings sheet for TV Display & Round Timer.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   timer: ReturnType<typeof import("@/hooks/useGymTimer").useGymTimer>,
 *   activeMode: "split" | "timer" | "check-in",
 *   onSelectMode: (mode: "split" | "timer" | "check-in") => void
 * }} props
 */
export default function TimerSettingsSheet({
  open,
  onClose,
  timer,
  activeMode,
  onSelectMode,
}) {
  const { state, prefs, updatePrefs, resetColors, testBell, sendCommand } =
    timer;
  const [remoteUrl, setRemoteUrl] = useState("/remote");

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      setRemoteUrl(`${window.location.origin}/remote`);
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gym Display Settings"
    >
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-zinc-950 text-zinc-100 shadow-2xl border-l border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur-xs">
          <h2 className="text-lg font-bold text-white">Display &amp; Timer Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {/* Coach Phone Remote QR Code */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Smartphone className="h-4 w-4 text-brand-gold" />
              Coach Phone Remote
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Scan to control rounds, presets, and TV layout from the mat.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0 rounded-xl bg-white p-2.5">
                <QRCodeSVG value={remoteUrl} size={108} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-mono text-zinc-300">
                  {remoteUrl}
                </p>
                <a
                  href="/remote"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-hover"
                >
                  Open /remote
                </a>
              </div>
            </div>
          </section>

          {/* Presets */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Round Presets
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2">
              {TIMER_PRESETS.map((preset) => {
                const active = state.activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      sendCommand("apply_preset", { presetId: preset.id })
                    }
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                      active
                        ? "border-brand-gold bg-brand-gold/15 text-white"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{preset.name}</p>
                      <p className="text-xs text-zinc-400">
                        {preset.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-300">
                      {formatDurationCompact(preset.roundDurationSec)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Audio */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                Audio &amp; Chimes
              </div>
              <button
                type="button"
                onClick={testBell}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                <Bell className="h-3.5 w-3.5 text-brand-gold" />
                Test Bell
              </button>
            </div>

            <label className="mt-3 block">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Master Volume</span>
                <span className="tabular-nums text-zinc-200">
                  {prefs.volume}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={prefs.volume}
                onChange={(e) =>
                  updatePrefs({ volume: Number(e.target.value) })
                }
                className="mt-1.5 w-full accent-brand-gold"
              />
            </label>

            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-zinc-200">
                Play check-in chime when students arrive
              </span>
              <input
                type="checkbox"
                checked={prefs.checkInChime}
                onChange={(e) =>
                  updatePrefs({ checkInChime: e.target.checked })
                }
                className="h-4 w-4 accent-brand-gold"
              />
            </label>
          </section>

          {/* TV Display & Popups */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Monitor className="h-4 w-4 text-sky-400" />
              TV Layout &amp; Check-In Popups
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { id: "split", label: "Split", Icon: Columns2 },
                { id: "timer", label: "Timer", Icon: TimerIcon },
                { id: "check-in", label: "Check-In", Icon: Users },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onSelectMode(
                      /** @type {"split"|"timer"|"check-in"} */ (id)
                    )
                  }
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-semibold transition ${
                    activeMode === id
                      ? "border-brand-gold bg-brand-gold text-zinc-950"
                      : "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-3.5 flex cursor-pointer items-center justify-between gap-3">
              <span className="text-xs text-zinc-300">
                Auto-switch Check-In screen to Split when timer starts
              </span>
              <input
                type="checkbox"
                checked={state.autoSwitchOnTimer}
                onChange={(e) =>
                  sendCommand("set_display", {
                    autoSwitchOnTimer: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-brand-gold"
              />
            </label>

            <div className="mt-3.5">
              <p className="text-xs font-medium text-zinc-400">
                Check-In Popup Style
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { id: "auto", label: "Auto" },
                  { id: "full", label: "Full" },
                  { id: "toast", label: "Toast" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      sendCommand("set_display", { popupMode: opt.id })
                    }
                    className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
                      state.popupMode === opt.id
                        ? "border-brand-gold bg-brand-gold/20 text-brand-gold"
                        : "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Auto uses full-screen celebration in Check-In mode and a corner
                toast during rounds.
              </p>
            </div>
          </section>

          {/* Timer Colors */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Palette className="h-4 w-4 text-brand-gold" />
                Timer Colors
              </div>
              <button
                type="button"
                onClick={resetColors}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {COLOR_FIELDS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
                >
                  <span>{label}</span>
                  <input
                    type="color"
                    value={prefs.colors[key]}
                    onChange={(e) =>
                      updatePrefs((prev) => ({
                        ...prev,
                        colors: { ...prev.colors, [key]: e.target.value },
                      }))
                    }
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

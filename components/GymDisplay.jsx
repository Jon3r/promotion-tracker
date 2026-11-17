"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Columns2,
  Maximize2,
  Minimize2,
  Settings,
  Smartphone,
  Timer as TimerIcon,
  Users,
} from "lucide-react";
import { useGymTimer } from "@/hooks/useGymTimer";
import { useClubWorxCheckIn } from "@/hooks/useClubWorxCheckIn";
import RoundTimer from "@/components/RoundTimer";
import CheckInPanel from "@/components/CheckInPanel";
import CheckInBoard from "@/components/CheckInBoard";
import TimerSettingsSheet from "@/components/TimerSettingsSheet";

/**
 * Unified Gym TV Display supporting Split, Timer, and Check-In modes,
 * remote control sync, keyboard shortcuts, and check-in toast/chime alerts.
 * @param {{ defaultMode?: "split" | "timer" | "check-in" }} props
 */
export default function GymDisplay({ defaultMode = "split" }) {
  const timer = useGymTimer({ enableAudio: true });
  const checkIn = useClubWorxCheckIn();

  const [mode, setMode] = useState(defaultMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const seededDisplayRef = useRef(false);
  const lastServerDisplayRef = useRef(timer.state.displayMode);

  // Sync TV mode when remote updates `displayMode` after initial load
  useEffect(() => {
    if (!timer.hasServerSync) return;

    if (!seededDisplayRef.current) {
      seededDisplayRef.current = true;
      lastServerDisplayRef.current = timer.state.displayMode;
      // On primary /gym route, honor remote's current displayMode if changed from default
      if (defaultMode === "split" && timer.state.displayMode !== "split") {
        queueMicrotask(() => setMode(timer.state.displayMode));
      }
      return;
    }

    if (timer.state.displayMode !== lastServerDisplayRef.current) {
      lastServerDisplayRef.current = timer.state.displayMode;
      const next = timer.state.displayMode;
      queueMicrotask(() => setMode(next));
    }
  }, [timer.hasServerSync, timer.state.displayMode, defaultMode]);

  const { sendCommand, unlockAudio, playCheckInChime } = timer;

  const handleSelectMode = useCallback(
    (nextMode) => {
      setMode(nextMode);
      lastServerDisplayRef.current = nextMode;
      sendCommand("set_display", { displayMode: nextMode });
    },
    [sendCommand]
  );

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in restricted environments
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts: Space (toggle), R (reset), F (fullscreen), 1/2/3 (modes)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        unlockAudio();
        sendCommand("toggle");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        sendCommand("reset");
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "1") {
        e.preventDefault();
        handleSelectMode("split");
      } else if (e.key === "2") {
        e.preventDefault();
        handleSelectMode("timer");
      } else if (e.key === "3") {
        e.preventDefault();
        handleSelectMode("check-in");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sendCommand, unlockAudio, toggleFullscreen, handleSelectMode]);

  const handleNewCheckIn = useCallback(() => {
    playCheckInChime();
  }, [playCheckInChime]);

  const resolvedPopupVariant = (() => {
    if (timer.state.popupMode === "full") return "full";
    if (timer.state.popupMode === "toast") return "toast";
    return mode === "check-in" ? "full" : "toast";
  })();

  const isLightToolbar = mode === "check-in";

  return (
    <div className="relative min-h-screen w-full overflow-x-clip">
      {/* Floating top-right mode pill & controls */}
      <div
        className={`fixed top-3 right-3 z-40 flex flex-wrap items-center gap-1.5 rounded-full border p-1 shadow-lg backdrop-blur-md ${
          isLightToolbar
            ? "border-zinc-200 bg-white/90 text-zinc-800"
            : "border-white/15 bg-zinc-900/85 text-zinc-100"
        }`}
      >
        <div className="flex items-center gap-0.5">
          {[
            { id: "split", label: "Split", Icon: Columns2 },
            { id: "timer", label: "Timer", Icon: TimerIcon },
            { id: "check-in", label: "Check-In", Icon: Users },
          ].map(({ id, label, Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  handleSelectMode(
                    /** @type {"split"|"timer"|"check-in"} */ (id)
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-brand-blue text-white"
                    : isLightToolbar
                      ? "text-zinc-600 hover:bg-zinc-100"
                      : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <span
          className={`mx-0.5 h-4 w-px ${
            isLightToolbar ? "bg-zinc-200" : "bg-white/15"
          }`}
          aria-hidden="true"
        />

        <Link
          href="/remote"
          title="Coach Phone Remote"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
            isLightToolbar
              ? "text-zinc-700 hover:bg-zinc-100"
              : "text-zinc-200 hover:bg-white/10"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Remote</span>
        </Link>

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          aria-label="Toggle fullscreen"
          className={`inline-flex items-center justify-center rounded-full p-1.5 transition ${
            isLightToolbar
              ? "text-zinc-700 hover:bg-zinc-100"
              : "text-zinc-200 hover:bg-white/10"
          }`}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Settings & QR Remote"
          aria-label="Open settings"
          className={`inline-flex items-center justify-center rounded-full p-1.5 transition ${
            isLightToolbar
              ? "text-zinc-700 hover:bg-zinc-100"
              : "text-zinc-200 hover:bg-white/10"
          }`}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Active Mode Content */}
      {mode === "split" && (
        <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
          <div className="min-h-[60vh] lg:h-screen">
            <RoundTimer timer={timer} compact />
          </div>
          <div className="border-t border-zinc-200 lg:h-screen lg:border-t-0 lg:border-l">
            <CheckInPanel
              checkIn={checkIn}
              compact
              popupVariant={resolvedPopupVariant}
              onNewCheckIn={handleNewCheckIn}
            />
          </div>
        </div>
      )}

      {mode === "timer" && (
        <div className="min-h-screen w-full">
          <RoundTimer timer={timer} />
          {/* Silent check-in listeners so corner toasts + chime fire during rounds */}
          {(checkIn.classBoards || []).map((board, index) => (
            <CheckInBoard
              key={`${board.classInfo.id}-${board.classInfo.startsAt || ""}`}
              attendees={board.attendees}
              popupVariant="toast"
              hideList
              toastStackIndex={index}
              onNewCheckIn={handleNewCheckIn}
            />
          ))}
        </div>
      )}

      {mode === "check-in" && (
        <div className="min-h-screen w-full bg-white">
          <CheckInPanel
            checkIn={checkIn}
            popupVariant={resolvedPopupVariant}
            onNewCheckIn={handleNewCheckIn}
          />
        </div>
      )}

      <TimerSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timer={timer}
        activeMode={mode}
        onSelectMode={handleSelectMode}
      />
    </div>
  );
}

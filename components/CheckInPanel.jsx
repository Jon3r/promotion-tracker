"use client";

import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import CheckInBoard from "@/components/CheckInBoard";

/**
 * Reusable ClubWorx check-in panel for both full-screen `/check-in` and Split `/gym`.
 * @param {{
 *   checkIn: ReturnType<typeof import("@/hooks/useClubWorxCheckIn").useClubWorxCheckIn>,
 *   compact?: boolean,
 *   popupVariant?: "full" | "toast",
 *   onNewCheckIn?: (person: { contactKey: string, fullName: string }) => void
 * }} props
 */
export default function CheckInPanel({
  checkIn,
  compact = false,
  popupVariant = "full",
  onNewCheckIn,
}) {
  const {
    currentClass,
    nextClass,
    status,
    statusLabel,
    attendees,
    attendeesClassId,
    attendeesCount,
    scheduleLoading,
    scheduleError,
    attendeesLoading,
    attendeesError,
    lastAttendeesAt,
    formatTimeLabel,
  } = checkIn;

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col bg-white text-zinc-900 ${
        compact
          ? "h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
          : "mx-auto min-h-screen w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8"
      }`}
    >
      {compact ? (
        <header className="mb-4 flex items-center gap-3 border-b border-zinc-200 pb-3">
          <Image
            src="/pja-logo.png"
            alt="Parramatta Jiu Jitsu Academy"
            width={48}
            height={48}
            className="h-11 w-11 shrink-0 rounded-full"
            priority
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-brand-blue">
              Check in
            </h1>
            <p className="text-xs font-medium text-zinc-500">
              Parramatta Jiu Jitsu Academy
            </p>
          </div>
        </header>
      ) : (
        <PageHeader title="Check in" centered largeTitle />
      )}

      <section
        className={`min-w-0 border-b border-zinc-200 ${
          compact ? "mb-4 pb-4" : "mb-6 pb-6"
        }`}
      >
        {scheduleLoading && (
          <p className="text-zinc-500">Loading today’s schedule…</p>
        )}
        {scheduleError && (
          <p className="text-red-600" role="alert">
            {scheduleError}
          </p>
        )}
        {!scheduleLoading && !scheduleError && currentClass && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue sm:text-sm">
              {statusLabel}
            </p>
            <h2
              className={`mt-1 font-bold tracking-tight text-zinc-900 ${
                compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"
              }`}
            >
              {currentClass.title}
            </h2>
            <p
              className={`mt-1.5 text-zinc-600 ${
                compact ? "text-sm sm:text-base" : "text-lg sm:text-xl"
              }`}
            >
              {formatTimeLabel(currentClass.startsAt)}
              {currentClass.endsAt
                ? ` – ${formatTimeLabel(currentClass.endsAt)}`
                : ""}
              {currentClass.organisation
                ? ` · ${currentClass.organisation}`
                : ""}
            </p>
            <p
              className={`mt-2 font-semibold text-brand-blue ${
                compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              }`}
            >
              {attendeesCount} checked in
            </p>
          </div>
        )}
        {!scheduleLoading && !scheduleError && !currentClass && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:text-sm">
              {statusLabel}
            </p>
            <h2
              className={`mt-1 font-bold tracking-tight text-zinc-900 ${
                compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
              }`}
            >
              {nextClass
                ? `Next class at ${formatTimeLabel(nextClass.startsAt)}`
                : status === "empty"
                  ? "No classes scheduled today"
                  : "No more classes today"}
            </h2>
            {nextClass && (
              <p className="mt-1.5 text-base text-zinc-600 sm:text-lg">
                {nextClass.title}
              </p>
            )}
          </div>
        )}
      </section>

      {currentClass && (
        <section className="min-w-0 flex-1">
          {attendeesError && (
            <p className="mb-4 text-red-600" role="alert">
              {attendeesError}
            </p>
          )}
          {!attendeesError && attendees.length === 0 && (
            <p
              className={`text-zinc-500 ${
                compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              }`}
            >
              {attendeesLoading
                ? "Loading check-ins…"
                : "Waiting for the first check-in…"}
            </p>
          )}
          {attendees.length > 0 && (
            <CheckInBoard
              key={currentClass.id}
              attendees={attendees}
              compact={compact}
              popupVariant={popupVariant}
              onNewCheckIn={onNewCheckIn}
            />
          )}
          {lastAttendeesAt && attendeesClassId === currentClass.id && (
            <p
              className={`text-xs text-zinc-400 ${compact ? "mt-4" : "mt-8 text-sm"}`}
            >
              Last updated {lastAttendeesAt.toLocaleTimeString()}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

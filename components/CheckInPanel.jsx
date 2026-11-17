"use client";

import Image from "next/image";
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
    classBoards = [],
    nextClass,
    status,
    statusLabel,
    attendees,
    attendeesCount,
    scheduleLoading,
    scheduleError,
    attendeesLoading,
    attendeesError,
    lastAttendeesAt,
    formatTimeLabel,
  } = checkIn;

  const boards =
    classBoards.length > 0
      ? classBoards
      : currentClass
        ? [
            {
              classInfo: currentClass,
              attendees,
              status,
            },
          ]
        : [];
  const sideBySide = boards.length > 1;

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col bg-brand-blue text-white ${
        compact
          ? "h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
          : "mx-auto min-h-screen w-full max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8"
      }`}
    >
      <header
        className={`flex items-center gap-3 border-b border-white/25 ${
          compact ? "mb-4 pb-3" : "mb-6 justify-center pb-6"
        }`}
      >
        <Image
          src="/pja-logo.png"
          alt="Parramatta Jiu Jitsu Academy"
          width={80}
          height={80}
          className={`shrink-0 rounded-full ${
            compact ? "h-11 w-11" : "h-16 w-16 sm:h-20 sm:w-20"
          }`}
          priority
        />
        <div className="min-w-0">
          <h1
            className={`font-bold tracking-tight text-brand-gold ${
              compact ? "text-xl" : "text-3xl sm:text-5xl"
            }`}
          >
            Check in
          </h1>
          <p className={`font-medium text-white/80 ${compact ? "text-xs" : "text-sm sm:text-base"}`}>
            Parramatta Jiu Jitsu Academy
          </p>
        </div>
      </header>

      {scheduleLoading && (
        <p className="text-white/75">Loading today’s schedule…</p>
      )}
      {scheduleError && (
        <p className="text-brand-gold" role="alert">
          {scheduleError}
        </p>
      )}

      {!scheduleLoading && !scheduleError && sideBySide && (
        <>
          {attendeesError && (
            <p className="mb-4 text-brand-gold" role="alert">
              {attendeesError}
            </p>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
            {boards.map((board, index) => (
              <ClassColumn
                key={`${board.classInfo.id}-${board.classInfo.startsAt || ""}`}
                board={board}
                compact={compact}
                popupVariant={popupVariant}
                attendeesLoading={attendeesLoading}
                formatTimeLabel={formatTimeLabel}
                onNewCheckIn={onNewCheckIn}
                toastStackIndex={index}
                divided={index > 0}
              />
            ))}
          </div>
        </>
      )}

      {!scheduleLoading && !scheduleError && !sideBySide && currentClass && (
        <>
          <section
            className={`min-w-0 border-b border-white/25 ${
              compact ? "mb-4 pb-4" : "mb-6 pb-6"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
                {statusLabel}
              </p>
              <h2
                className={`mt-1 font-bold tracking-tight text-brand-gold ${
                  compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"
                }`}
              >
                {currentClass.title}
              </h2>
              <p
                className={`mt-1.5 text-white/80 ${
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
                className={`mt-2 font-semibold text-white ${
                  compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {attendeesCount} checked in
              </p>
            </div>
          </section>

          <section className="min-w-0 flex-1">
            {attendeesError && (
              <p className="mb-4 text-brand-gold" role="alert">
                {attendeesError}
              </p>
            )}
            {!attendeesError && attendees.length === 0 && (
              <p
                className={`text-white/75 ${
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
          </section>
        </>
      )}

      {!scheduleLoading && !scheduleError && !currentClass && (
        <section
          className={`min-w-0 border-b border-white/25 ${
            compact ? "mb-4 pb-4" : "mb-6 pb-6"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
              {statusLabel}
            </p>
            <h2
              className={`mt-1 font-bold tracking-tight text-brand-gold ${
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
              <p className="mt-1.5 text-base text-white/80 sm:text-lg">
                {nextClass.title}
              </p>
            )}
          </div>
        </section>
      )}

      {lastAttendeesAt && boards.length > 0 && (
        <p
          className={`text-xs text-white/60 ${compact ? "mt-4" : "mt-8 text-sm"}`}
        >
          Last updated {lastAttendeesAt.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function ClassColumn({
  board,
  compact,
  popupVariant,
  attendeesLoading,
  formatTimeLabel,
  onNewCheckIn,
  toastStackIndex,
  divided,
}) {
  const { classInfo, attendees: names, status: columnStatus } = board;
  const label = columnStatus === "upcoming" ? "Starting soon" : "Live now";

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col ${
        divided
          ? compact
            ? "mt-5 border-t border-white/25 pt-5 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-5"
            : "mt-6 border-t border-white/25 pt-6 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-8"
          : compact
            ? "md:pr-5"
            : "md:pr-8"
      }`}
    >
      <div
        className={`min-w-0 border-b border-white/25 ${
          compact ? "mb-4 pb-4" : "mb-6 pb-6"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
          {label}
        </p>
        <h2
          className={`mt-1 font-bold tracking-tight text-brand-gold ${
            compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {classInfo.title}
        </h2>
        <p
          className={`mt-1.5 text-white/80 ${
            compact ? "text-sm" : "text-base sm:text-lg"
          }`}
        >
          {formatTimeLabel(classInfo.startsAt)}
          {classInfo.endsAt ? ` – ${formatTimeLabel(classInfo.endsAt)}` : ""}
          {classInfo.organisation ? ` · ${classInfo.organisation}` : ""}
        </p>
        <p
          className={`mt-2 font-semibold text-white ${
            compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {names.length} checked in
        </p>
      </div>

      <div className="min-w-0 flex-1">
        {names.length === 0 && (
          <p
            className={`text-white/75 ${
              compact ? "text-base" : "text-lg sm:text-xl"
            }`}
          >
            {attendeesLoading
              ? "Loading check-ins…"
              : "Waiting for the first check-in…"}
          </p>
        )}
        {names.length > 0 && (
          <CheckInBoard
            key={`${classInfo.id}-${classInfo.startsAt || ""}`}
            attendees={names}
            compact={compact}
            singleColumn
            popupVariant={popupVariant}
            toastStackIndex={toastStackIndex}
            onNewCheckIn={onNewCheckIn}
          />
        )}
      </div>
    </section>
  );
}

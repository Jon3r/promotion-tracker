"use client";

import { useEffect, useRef, useState } from "react";

const POPUP_MS = 2800;

/**
 * @typedef {{ contactKey: string, fullName: string }} CheckInPerson
 */

/**
 * Responsive multi-column check-in list with enter animations and a
 * flashy popup (or non-blocking corner toast) when someone newly checks in.
 *
 * Remount with a new `key={classId}` from the parent when the class changes
 * so known check-ins reset without a sync setState-in-effect.
 *
 * @param {{ attendees: CheckInPerson[], compact?: boolean, popupVariant?: "full" | "toast", hideList?: boolean, singleColumn?: boolean, toastStackIndex?: number, onNewCheckIn?: (person: CheckInPerson) => void }} props
 */
export default function CheckInBoard({
  attendees,
  compact = false,
  popupVariant = "full",
  hideList = false,
  singleColumn = false,
  toastStackIndex = 0,
  onNewCheckIn,
}) {
  const [animatingKeys, setAnimatingKeys] = useState(() => new Set());
  const [popup, setPopup] = useState(/** @type {CheckInPerson|null} */ (null));
  const [queueTick, setQueueTick] = useState(0);
  const knownKeysRef = useRef(/** @type {Set<string>|null} */ (null));
  const queueRef = useRef(/** @type {CheckInPerson[]} */ ([]));
  const onNewCheckInRef = useRef(onNewCheckIn);

  useEffect(() => {
    onNewCheckInRef.current = onNewCheckIn;
  }, [onNewCheckIn]);

  useEffect(() => {
    const list = attendees || [];
    const known = knownKeysRef.current;

    if (known == null) {
      // Seed quietly on first payload for this mount — no popup for the
      // people already checked in when the screen loaded.
      knownKeysRef.current = new Set(
        list.map((p) => p.contactKey).filter(Boolean)
      );
      return;
    }

    const newcomers = list.filter(
      (p) => p.contactKey && !known.has(p.contactKey)
    );
    if (!newcomers.length) return;

    for (const person of newcomers) {
      known.add(person.contactKey);
    }
    knownKeysRef.current = known;
    queueRef.current.push(...newcomers);

    // Defer state updates so we aren't syncing setState in the effect body
    // in a way that cascades renders on the same turn.
    queueMicrotask(() => {
      for (const person of newcomers) {
        onNewCheckInRef.current?.(person);
      }
      setAnimatingKeys((prev) => {
        const next = new Set(prev);
        for (const person of newcomers) next.add(person.contactKey);
        return next;
      });
      setQueueTick((n) => n + 1);
    });
  }, [attendees]);

  useEffect(() => {
    if (popup) return undefined;
    const next = queueRef.current.shift();
    if (!next) return undefined;

    const showTimer = setTimeout(() => setPopup(next), 0);
    const hideTimer = setTimeout(() => setPopup(null), POPUP_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [popup, queueTick]);

  if (!attendees?.length && !popup) return null;

  const listClass = singleColumn
    ? "check-in-columns--single"
    : compact
      ? "check-in-columns--multi"
      : "check-in-columns";
  const itemBaseClass = compact
    ? "check-in-name check-in-name--compact break-inside-avoid"
    : "check-in-name break-inside-avoid";

  return (
    <>
      {!hideList && attendees?.length > 0 && (
        <ul className={listClass}>
          {attendees.map((person) => {
            const animate = animatingKeys.has(person.contactKey);
            return (
              <li
                key={person.contactKey}
                className={`${itemBaseClass}${
                  animate ? " check-in-name--enter" : ""
                }`}
                onAnimationEnd={() => {
                  if (!animate) return;
                  setAnimatingKeys((prev) => {
                    if (!prev.has(person.contactKey)) return prev;
                    const next = new Set(prev);
                    next.delete(person.contactKey);
                    return next;
                  });
                }}
              >
                {person.fullName}
              </li>
            );
          })}
        </ul>
      )}

      {popup && popupVariant === "toast" && (
        <div
          className="check-in-toast"
          style={
            toastStackIndex > 0
              ? { bottom: `calc(1.25rem + ${toastStackIndex * 5.75}rem)` }
              : undefined
          }
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="check-in-toast__eyebrow">Checked in</p>
          <p className="check-in-toast__name">{popup.fullName}</p>
        </div>
      )}

      {popup && popupVariant === "full" && (
        <div
          className="check-in-popup"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="check-in-popup__burst" aria-hidden="true" />
          <div className="check-in-popup__card">
            <p className="check-in-popup__eyebrow">Checked in</p>
            <p className="check-in-popup__name">{popup.fullName}</p>
          </div>
        </div>
      )}
    </>
  );
}

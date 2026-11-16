"use client";

import { useEffect, useRef, useState } from "react";

const POPUP_MS = 2800;

/**
 * @typedef {{ contactKey: string, fullName: string }} CheckInPerson
 */

/**
 * Responsive multi-column check-in list with enter animations and a
 * flashy popup when someone newly checks in.
 *
 * Remount with a new `key={classId}` from the parent when the class changes
 * so known check-ins reset without a sync setState-in-effect.
 *
 * @param {{ attendees: CheckInPerson[] }} props
 */
export default function CheckInBoard({ attendees }) {
  const [animatingKeys, setAnimatingKeys] = useState(() => new Set());
  const [popup, setPopup] = useState(/** @type {CheckInPerson|null} */ (null));
  const [queueTick, setQueueTick] = useState(0);
  const knownKeysRef = useRef(/** @type {Set<string>|null} */ (null));
  const queueRef = useRef(/** @type {CheckInPerson[]} */ ([]));

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

  if (!attendees?.length) return null;

  return (
    <>
      <ul className="check-in-columns">
        {attendees.map((person) => {
          const animate = animatingKeys.has(person.contactKey);
          return (
            <li
              key={person.contactKey}
              className={`check-in-name break-inside-avoid${
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

      {popup && (
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

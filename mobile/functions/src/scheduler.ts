import type { ClassSession } from "./clubworx/classes";
import {
  classHasEndedForConfirm,
  classIsAboutToFinish,
  classIsRunning,
} from "./clubworx/classes";
import {
  isSnoozed,
  type StripeCandidate,
} from "./eligibility/stripeDue";

export type NotificationDecision =
  | {
      type: "class_ending";
      key: string;
      classId: string;
      dayKey: string;
      title: string;
      candidates: StripeCandidate[];
    }
  | {
      type: "confirm";
      key: string;
      classId: string;
      dayKey: string;
      title: string;
      candidate: StripeCandidate;
    };

export function endingNotificationKey(eventId: string, dayKey: string): string {
  return `${eventId}:${dayKey}:ending`;
}

export function confirmNotificationKey(
  eventId: string,
  dayKey: string,
  contactKey: string
): string {
  return `${eventId}:${dayKey}:${contactKey}:confirm`;
}

export function confirmDocId(eventId: string, dayKey: string, contactKey: string): string {
  return `${eventId}_${dayKey}_${contactKey}`;
}

export function filterActiveCandidates(
  candidates: StripeCandidate[],
  snoozes: Map<string, Date>,
  now: Date
): StripeCandidate[] {
  return candidates.filter((c) => !isSnoozed(snoozes.get(c.contactKey) ?? null, now));
}

/**
 * Wave 1: class running or in the last 10 minutes — one push per class.
 * Wave 2: shortly after class end — one push per due person who was not delayed.
 */
export function decideNotifications(args: {
  now: Date;
  classes: ClassSession[];
  candidatesByClass: Map<string, StripeCandidate[]>;
  snoozes: Map<string, Date>;
  alreadySent: Set<string>;
  alreadyResolved: Set<string>;
}): NotificationDecision[] {
  const decisions: NotificationDecision[] = [];

  for (const session of args.classes) {
    const dayKey = session.dayKey || (session.startsAt ? session.startsAt.slice(0, 10) : "");
    if (!dayKey || !session.id) continue;

    const raw = args.candidatesByClass.get(session.id) || [];
    const active = filterActiveCandidates(raw, args.snoozes, args.now);
    if (!active.length) continue;

    const endingKey = endingNotificationKey(session.id, dayKey);
    if (
      !args.alreadySent.has(endingKey) &&
      (classIsRunning(session, args.now) || classIsAboutToFinish(session, args.now))
    ) {
      decisions.push({
        type: "class_ending",
        key: endingKey,
        classId: session.id,
        dayKey,
        title: session.title,
        candidates: active,
      });
    }

    if (!classHasEndedForConfirm(session, args.now)) continue;

    for (const candidate of active) {
      const confirmKey = confirmNotificationKey(session.id, dayKey, candidate.contactKey);
      const resolvedKey = confirmDocId(session.id, dayKey, candidate.contactKey);
      if (args.alreadySent.has(confirmKey)) continue;
      if (args.alreadyResolved.has(resolvedKey)) continue;
      decisions.push({
        type: "confirm",
        key: confirmKey,
        classId: session.id,
        dayKey,
        title: session.title,
        candidate,
      });
    }
  }

  return decisions;
}

export function classEndingBody(candidates: StripeCandidate[]): string {
  const names = candidates
    .slice(0, 4)
    .map((c) => c.fullName)
    .join(", ");
  const extra = candidates.length > 4 ? ` +${candidates.length - 4} more` : "";
  return `${candidates.length} stripe promotion${candidates.length === 1 ? "" : "s"} due: ${names}${extra}`;
}

export function confirmBody(candidate: StripeCandidate, classTitle: string): string {
  return `Did ${candidate.fullName} get ${candidate.nextLabel} in ${classTitle}?`;
}

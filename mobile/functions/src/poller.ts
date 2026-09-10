import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { loadDaySchedule, classCandidates } from "./data";
import { sendDecisions } from "./fcm";
import { clubworxAccountKey } from "./secrets";
import { decideNotifications } from "./scheduler";
import {
  ensureDefaultCoach,
  listCoachTokens,
  loadNotificationLog,
  loadResolvedConfirmations,
  loadSnoozes,
  markPendingConfirmation,
  recordNotification,
} from "./store";

export const pollClassPromotions = onSchedule(
  {
    schedule: "every 2 minutes",
    secrets: [clubworxAccountKey],
    timeZone: "Australia/Sydney",
  },
  async () => {
    await runPromotionPoll(new Date());
  }
);

export async function runPromotionPoll(now: Date): Promise<{ sent: number }> {
  const db = getFirestore();
  await ensureDefaultCoach(db);

  const day = now.toISOString().slice(0, 10);
  const schedule = await loadDaySchedule(day);
  const candidatesByClass = new Map(
    schedule.classes.map((session) => [
      session.id,
      classCandidates(session.id, schedule.bookings, schedule.memberStyles),
    ])
  );

  const [snoozes, alreadySent, alreadyResolved, tokens] = await Promise.all([
    loadSnoozes(db),
    loadNotificationLog(db),
    loadResolvedConfirmations(db),
    listCoachTokens(db),
  ]);

  const decisions = decideNotifications({
    now,
    classes: schedule.classes,
    candidatesByClass,
    snoozes,
    alreadySent,
    alreadyResolved,
  });

  for (const decision of decisions) {
    if (decision.type === "confirm") {
      await markPendingConfirmation(db, {
        eventId: decision.classId,
        dayKey: decision.dayKey,
        contactKey: decision.candidate.contactKey,
        memberStyleId: decision.candidate.memberStyleId,
        fullName: decision.candidate.fullName,
        currentRank: decision.candidate.currentRank,
        nextRank: decision.candidate.nextRank,
        currentLabel: decision.candidate.currentLabel,
        nextLabel: decision.candidate.nextLabel,
        classTitle: decision.title,
      });
    }
    await recordNotification(db, decision.key, {
      type: decision.type,
      classId: decision.classId,
      dayKey: decision.dayKey,
    });
  }

  const sent = await sendDecisions(getMessaging(), tokens, decisions);
  return { sent };
}

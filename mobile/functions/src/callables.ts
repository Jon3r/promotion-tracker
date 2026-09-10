import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { requireCoach } from "./authz";
import { classCandidates, loadDaySchedule } from "./data";
import { ALLOWED_SNOOZE_DAYS, isSnoozed, type SnoozeDays } from "./eligibility/stripeDue";
import { promoteMemberStyleRank } from "./promote";
import { clubworxAccountKey } from "./secrets";
import {
  loadSnoozes,
  saveCoachToken,
  writeConfirmation,
  writeSnooze,
  CONFIRM_COLLECTION,
} from "./store";

const clubworxCallable = { cors: true as const, secrets: [clubworxAccountKey] };

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export const getTodayTimetable = onCall(clubworxCallable, async (request) => {
  const db = getFirestore();
  await requireCoach(db, request.auth);
  const day = String(request.data?.day || todayKey());
  const schedule = await loadDaySchedule(day);
  return {
    ok: true,
    day,
    mock: schedule.mock,
    classes: schedule.classes,
  };
});

export const getClassCandidates = onCall(clubworxCallable, async (request) => {
  const db = getFirestore();
  await requireCoach(db, request.auth);
  const eventId = String(request.data?.eventId || "").trim();
  const day = String(request.data?.day || todayKey());
  if (!eventId) {
    throw new HttpsError("invalid-argument", "eventId is required");
  }
  const schedule = await loadDaySchedule(day);
  const snoozes = await loadSnoozes(db);
  const now = new Date();
  const candidates = classCandidates(
    eventId,
    schedule.bookings,
    schedule.memberStyles
  ).map((c) => ({
    ...c,
    snoozed: isSnoozed(snoozes.get(c.contactKey) ?? null, now),
    snoozeUntil: snoozes.get(c.contactKey)?.toISOString() ?? null,
  }));

  return {
    ok: true,
    eventId,
    day,
    mock: schedule.mock,
    candidates,
  };
});

export const snoozePromotion = onCall({ cors: true }, async (request) => {
  const db = getFirestore();
  const coach = await requireCoach(db, request.auth);
  const contactKey = String(request.data?.contactKey || "").trim();
  const days = Number(request.data?.days);
  const memberStyleIdRaw = request.data?.memberStyleId;
  const memberStyleId =
    memberStyleIdRaw == null || memberStyleIdRaw === ""
      ? null
      : Number(memberStyleIdRaw);

  if (!contactKey) {
    throw new HttpsError("invalid-argument", "contactKey is required");
  }
  if (!ALLOWED_SNOOZE_DAYS.includes(days as SnoozeDays)) {
    throw new HttpsError("invalid-argument", "days must be 7, 14, or 21");
  }

  const result = await writeSnooze(db, {
    contactKey,
    memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
    days: days as SnoozeDays,
    actorEmail: coach.email,
  });
  return { ok: true, ...result };
});

export const confirmPromotion = onCall(clubworxCallable, async (request) => {
  const db = getFirestore();
  const coach = await requireCoach(db, request.auth);
  const contactKey = String(request.data?.contactKey || "").trim();
  const eventId = String(request.data?.eventId || "").trim();
  const dayKey = String(request.data?.dayKey || request.data?.day || "").trim();
  const happened = Boolean(request.data?.happened);
  const memberStyleIdRaw = request.data?.memberStyleId;
  const memberStyleId =
    memberStyleIdRaw == null || memberStyleIdRaw === ""
      ? null
      : Number(memberStyleIdRaw);
  const nextRankName = String(request.data?.nextRank || "").trim();

  if (!contactKey || !eventId || !dayKey) {
    throw new HttpsError("invalid-argument", "contactKey, eventId, and dayKey are required");
  }

  let clubworxSynced = false;
  let warning: string | null = null;

  if (happened) {
    const schedule = await loadDaySchedule(dayKey);
    const result = await promoteMemberStyleRank({
      memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
      nextRankName,
      styles: schedule.styles,
    });
    clubworxSynced = result.ok && "clubworxSynced" in result ? result.clubworxSynced : false;
    warning = "warning" in result ? result.warning ?? null : null;
  }

  await writeConfirmation(db, {
    eventId,
    dayKey,
    contactKey,
    memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
    happened,
    actorEmail: coach.email,
    clubworxSynced,
    warning,
  });

  return { ok: true, clubworxSynced, warning };
});

export const getConfirmQueue = onCall({ cors: true }, async (request) => {
  const db = getFirestore();
  await requireCoach(db, request.auth);
  const snap = await db
    .collection(CONFIRM_COLLECTION)
    .where("status", "==", "pending")
    .get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { ok: true, items };
});

export const registerFcmToken = onCall({ cors: true }, async (request) => {
  const db = getFirestore();
  const coach = await requireCoach(db, request.auth);
  const token = String(request.data?.token || "").trim();
  if (!token) {
    throw new HttpsError("invalid-argument", "token is required");
  }
  await saveCoachToken(db, coach.uid, coach.email, token);
  return { ok: true };
});

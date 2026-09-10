import type { Firestore } from "firebase-admin/firestore";
import { addDays, snoozeDocId, type SnoozeDays } from "./eligibility/stripeDue";
import { confirmDocId } from "./scheduler";

export const COACH_COLLECTION = "allowed_coaches";
export const SNOOZE_COLLECTION = "promotion_snoozes";
export const CONFIRM_COLLECTION = "promotion_confirmations";
export const NOTIFICATION_LOG = "notification_log";
export const COACH_TOKENS = "coaches";

export const DEFAULT_COACH_EMAIL = "andy@onlyjonesy.com.au";

export function coachDocId(email: string): string {
  return email.trim().toLowerCase();
}

export async function isAllowedCoach(db: Firestore, email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const snap = await db.collection(COACH_COLLECTION).doc(coachDocId(email)).get();
  return snap.exists;
}

export async function ensureDefaultCoach(db: Firestore): Promise<void> {
  const ref = db.collection(COACH_COLLECTION).doc(coachDocId(DEFAULT_COACH_EMAIL));
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: DEFAULT_COACH_EMAIL,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function loadSnoozes(db: Firestore): Promise<Map<string, Date>> {
  const snap = await db.collection(SNOOZE_COLLECTION).get();
  const map = new Map<string, Date>();
  for (const doc of snap.docs) {
    const until = doc.data().snoozeUntil;
    if (!until) continue;
    const date = until.toDate ? until.toDate() : new Date(until);
    if (Number.isFinite(date.getTime())) {
      map.set(String(doc.data().contactKey || doc.id.split("_")[0]), date);
    }
  }
  return map;
}

export async function writeSnooze(
  db: Firestore,
  args: {
    contactKey: string;
    memberStyleId: number | null;
    days: SnoozeDays;
    now?: Date;
    actorEmail?: string;
  }
): Promise<{ snoozeUntil: string }> {
  const now = args.now ?? new Date();
  const until = addDays(now, args.days);
  await db
    .collection(SNOOZE_COLLECTION)
    .doc(snoozeDocId(args.contactKey, args.memberStyleId))
    .set({
      contactKey: args.contactKey,
      memberStyleId: args.memberStyleId,
      days: args.days,
      snoozeUntil: until.toISOString(),
      updatedAt: now.toISOString(),
      actorEmail: args.actorEmail ?? null,
    });
  return { snoozeUntil: until.toISOString() };
}

export async function loadResolvedConfirmations(db: Firestore): Promise<Set<string>> {
  const snap = await db.collection(CONFIRM_COLLECTION).get();
  const set = new Set<string>();
  for (const doc of snap.docs) {
    const status = String(doc.data().status || "");
    if (status === "yes" || status === "no") {
      set.add(doc.id);
    }
  }
  return set;
}

export async function writeConfirmation(
  db: Firestore,
  args: {
    eventId: string;
    dayKey: string;
    contactKey: string;
    memberStyleId: number | null;
    happened: boolean;
    actorEmail?: string;
    clubworxSynced?: boolean;
    warning?: string | null;
  }
): Promise<void> {
  await db
    .collection(CONFIRM_COLLECTION)
    .doc(confirmDocId(args.eventId, args.dayKey, args.contactKey))
    .set(
      {
        eventId: args.eventId,
        dayKey: args.dayKey,
        contactKey: args.contactKey,
        memberStyleId: args.memberStyleId,
        status: args.happened ? "yes" : "no",
        happened: args.happened,
        clubworxSynced: args.clubworxSynced ?? false,
        warning: args.warning ?? null,
        updatedAt: new Date().toISOString(),
        actorEmail: args.actorEmail ?? null,
      },
      { merge: true }
    );
}

export async function markPendingConfirmation(
  db: Firestore,
  args: {
    eventId: string;
    dayKey: string;
    contactKey: string;
    memberStyleId: number | null;
    fullName: string;
    currentRank: string;
    nextRank: string;
    currentLabel: string;
    nextLabel: string;
    classTitle: string;
  }
): Promise<void> {
  const ref = db
    .collection(CONFIRM_COLLECTION)
    .doc(confirmDocId(args.eventId, args.dayKey, args.contactKey));
  const snap = await ref.get();
  if (snap.exists && ["yes", "no"].includes(String(snap.data()?.status))) return;
  await ref.set(
    {
      ...args,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function loadNotificationLog(db: Firestore): Promise<Set<string>> {
  const snap = await db.collection(NOTIFICATION_LOG).get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function recordNotification(db: Firestore, key: string, payload: object): Promise<void> {
  await db.collection(NOTIFICATION_LOG).doc(key).set({
    ...payload,
    sentAt: new Date().toISOString(),
  });
}

export async function saveCoachToken(db: Firestore, uid: string, email: string, token: string): Promise<void> {
  await db.collection(COACH_TOKENS).doc(uid).set(
    {
      email,
      fcmToken: token,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function listCoachTokens(db: Firestore): Promise<string[]> {
  const snap = await db.collection(COACH_TOKENS).get();
  return snap.docs
    .map((d) => String(d.data().fcmToken || "").trim())
    .filter(Boolean);
}

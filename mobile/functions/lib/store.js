"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COACH_EMAIL = exports.COACH_TOKENS = exports.NOTIFICATION_LOG = exports.CONFIRM_COLLECTION = exports.SNOOZE_COLLECTION = exports.COACH_COLLECTION = void 0;
exports.coachDocId = coachDocId;
exports.isAllowedCoach = isAllowedCoach;
exports.ensureDefaultCoach = ensureDefaultCoach;
exports.loadSnoozes = loadSnoozes;
exports.writeSnooze = writeSnooze;
exports.loadResolvedConfirmations = loadResolvedConfirmations;
exports.writeConfirmation = writeConfirmation;
exports.markPendingConfirmation = markPendingConfirmation;
exports.loadNotificationLog = loadNotificationLog;
exports.recordNotification = recordNotification;
exports.saveCoachToken = saveCoachToken;
exports.listCoachTokens = listCoachTokens;
const stripeDue_1 = require("./eligibility/stripeDue");
const scheduler_1 = require("./scheduler");
exports.COACH_COLLECTION = "allowed_coaches";
exports.SNOOZE_COLLECTION = "promotion_snoozes";
exports.CONFIRM_COLLECTION = "promotion_confirmations";
exports.NOTIFICATION_LOG = "notification_log";
exports.COACH_TOKENS = "coaches";
exports.DEFAULT_COACH_EMAIL = "andy@onlyjonesy.com.au";
function coachDocId(email) {
    return email.trim().toLowerCase();
}
async function isAllowedCoach(db, email) {
    if (!email)
        return false;
    const snap = await db.collection(exports.COACH_COLLECTION).doc(coachDocId(email)).get();
    return snap.exists;
}
async function ensureDefaultCoach(db) {
    const ref = db.collection(exports.COACH_COLLECTION).doc(coachDocId(exports.DEFAULT_COACH_EMAIL));
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            email: exports.DEFAULT_COACH_EMAIL,
            createdAt: new Date().toISOString(),
        });
    }
}
async function loadSnoozes(db) {
    const snap = await db.collection(exports.SNOOZE_COLLECTION).get();
    const map = new Map();
    for (const doc of snap.docs) {
        const until = doc.data().snoozeUntil;
        if (!until)
            continue;
        const date = until.toDate ? until.toDate() : new Date(until);
        if (Number.isFinite(date.getTime())) {
            map.set(String(doc.data().contactKey || doc.id.split("_")[0]), date);
        }
    }
    return map;
}
async function writeSnooze(db, args) {
    const now = args.now ?? new Date();
    const until = (0, stripeDue_1.addDays)(now, args.days);
    await db
        .collection(exports.SNOOZE_COLLECTION)
        .doc((0, stripeDue_1.snoozeDocId)(args.contactKey, args.memberStyleId))
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
async function loadResolvedConfirmations(db) {
    const snap = await db.collection(exports.CONFIRM_COLLECTION).get();
    const set = new Set();
    for (const doc of snap.docs) {
        const status = String(doc.data().status || "");
        if (status === "yes" || status === "no") {
            set.add(doc.id);
        }
    }
    return set;
}
async function writeConfirmation(db, args) {
    await db
        .collection(exports.CONFIRM_COLLECTION)
        .doc((0, scheduler_1.confirmDocId)(args.eventId, args.dayKey, args.contactKey))
        .set({
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
    }, { merge: true });
}
async function markPendingConfirmation(db, args) {
    const ref = db
        .collection(exports.CONFIRM_COLLECTION)
        .doc((0, scheduler_1.confirmDocId)(args.eventId, args.dayKey, args.contactKey));
    const snap = await ref.get();
    if (snap.exists && ["yes", "no"].includes(String(snap.data()?.status)))
        return;
    await ref.set({
        ...args,
        status: "pending",
        createdAt: new Date().toISOString(),
    }, { merge: true });
}
async function loadNotificationLog(db) {
    const snap = await db.collection(exports.NOTIFICATION_LOG).get();
    return new Set(snap.docs.map((d) => d.id));
}
async function recordNotification(db, key, payload) {
    await db.collection(exports.NOTIFICATION_LOG).doc(key).set({
        ...payload,
        sentAt: new Date().toISOString(),
    });
}
async function saveCoachToken(db, uid, email, token) {
    await db.collection(exports.COACH_TOKENS).doc(uid).set({
        email,
        fcmToken: token,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}
async function listCoachTokens(db) {
    const snap = await db.collection(exports.COACH_TOKENS).get();
    return snap.docs
        .map((d) => String(d.data().fcmToken || "").trim())
        .filter(Boolean);
}
//# sourceMappingURL=store.js.map
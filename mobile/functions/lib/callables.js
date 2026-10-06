"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFcmToken = exports.getConfirmQueue = exports.confirmPromotion = exports.snoozePromotion = exports.getClassCandidates = exports.getTodayTimetable = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const authz_1 = require("./authz");
const data_1 = require("./data");
const stripeDue_1 = require("./eligibility/stripeDue");
const promote_1 = require("./promote");
const secrets_1 = require("./secrets");
const store_1 = require("./store");
const clubworxCallable = { cors: true, secrets: [secrets_1.clubworxAccountKey] };
function todayKey(now = new Date()) {
    return now.toISOString().slice(0, 10);
}
exports.getTodayTimetable = (0, https_1.onCall)(clubworxCallable, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    await (0, authz_1.requireCoach)(db, request.auth);
    const day = String(request.data?.day || todayKey());
    const schedule = await (0, data_1.loadDaySchedule)(day);
    return {
        ok: true,
        day,
        mock: schedule.mock,
        classes: schedule.classes,
    };
});
exports.getClassCandidates = (0, https_1.onCall)(clubworxCallable, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    await (0, authz_1.requireCoach)(db, request.auth);
    const eventId = String(request.data?.eventId || "").trim();
    const day = String(request.data?.day || todayKey());
    if (!eventId) {
        throw new https_1.HttpsError("invalid-argument", "eventId is required");
    }
    const schedule = await (0, data_1.loadDaySchedule)(day);
    const snoozes = await (0, store_1.loadSnoozes)(db);
    const now = new Date();
    const candidates = (0, data_1.classCandidates)(eventId, schedule.bookings, schedule.memberStyles).map((c) => ({
        ...c,
        snoozed: (0, stripeDue_1.isSnoozed)(snoozes.get(c.contactKey) ?? null, now),
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
exports.snoozePromotion = (0, https_1.onCall)({ cors: true }, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    const coach = await (0, authz_1.requireCoach)(db, request.auth);
    const contactKey = String(request.data?.contactKey || "").trim();
    const days = Number(request.data?.days);
    const memberStyleIdRaw = request.data?.memberStyleId;
    const memberStyleId = memberStyleIdRaw == null || memberStyleIdRaw === ""
        ? null
        : Number(memberStyleIdRaw);
    if (!contactKey) {
        throw new https_1.HttpsError("invalid-argument", "contactKey is required");
    }
    if (!stripeDue_1.ALLOWED_SNOOZE_DAYS.includes(days)) {
        throw new https_1.HttpsError("invalid-argument", "days must be 7, 14, or 21");
    }
    const result = await (0, store_1.writeSnooze)(db, {
        contactKey,
        memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
        days: days,
        actorEmail: coach.email,
    });
    return { ok: true, ...result };
});
exports.confirmPromotion = (0, https_1.onCall)(clubworxCallable, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    const coach = await (0, authz_1.requireCoach)(db, request.auth);
    const contactKey = String(request.data?.contactKey || "").trim();
    const eventId = String(request.data?.eventId || "").trim();
    const dayKey = String(request.data?.dayKey || request.data?.day || "").trim();
    const happened = Boolean(request.data?.happened);
    const memberStyleIdRaw = request.data?.memberStyleId;
    const memberStyleId = memberStyleIdRaw == null || memberStyleIdRaw === ""
        ? null
        : Number(memberStyleIdRaw);
    const nextRankName = String(request.data?.nextRank || "").trim();
    if (!contactKey || !eventId || !dayKey) {
        throw new https_1.HttpsError("invalid-argument", "contactKey, eventId, and dayKey are required");
    }
    let clubworxSynced = false;
    let warning = null;
    if (happened) {
        const result = await (0, promote_1.promoteMemberStyleRank)({
            memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
            nextRankName,
            styles: await (0, data_1.loadStyles)(),
        });
        clubworxSynced = result.ok && "clubworxSynced" in result ? result.clubworxSynced : false;
        warning = "warning" in result ? result.warning ?? null : null;
        if (clubworxSynced)
            (0, data_1.invalidateMemberStyles)();
    }
    await (0, store_1.writeConfirmation)(db, {
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
exports.getConfirmQueue = (0, https_1.onCall)({ cors: true }, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    await (0, authz_1.requireCoach)(db, request.auth);
    const snap = await db
        .collection(store_1.CONFIRM_COLLECTION)
        .where("status", "==", "pending")
        .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { ok: true, items };
});
exports.registerFcmToken = (0, https_1.onCall)({ cors: true }, async (request) => {
    const db = (0, firestore_1.getFirestore)();
    const coach = await (0, authz_1.requireCoach)(db, request.auth);
    const token = String(request.data?.token || "").trim();
    if (!token) {
        throw new https_1.HttpsError("invalid-argument", "token is required");
    }
    await (0, store_1.saveCoachToken)(db, coach.uid, coach.email, token);
    return { ok: true };
});
//# sourceMappingURL=callables.js.map
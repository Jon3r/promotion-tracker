"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollClassPromotions = void 0;
exports.runPromotionPoll = runPromotionPoll;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const classes_1 = require("./clubworx/classes");
const data_1 = require("./data");
const fcm_1 = require("./fcm");
const secrets_1 = require("./secrets");
const scheduler_2 = require("./scheduler");
const store_1 = require("./store");
exports.pollClassPromotions = (0, scheduler_1.onSchedule)({
    schedule: "every 2 minutes",
    secrets: [secrets_1.clubworxAccountKey],
    timeZone: "Australia/Sydney",
}, async () => {
    await runPromotionPoll(new Date());
});
async function runPromotionPoll(now) {
    const db = (0, firestore_1.getFirestore)();
    await (0, store_1.ensureDefaultCoach)(db);
    const day = now.toISOString().slice(0, 10);
    const { classes, bookings } = await (0, data_1.loadDayClasses)(day);
    const activeClasses = classes.filter((session) => (0, classes_1.classInNotificationWindow)(session, now));
    if (!activeClasses.length)
        return { sent: 0 };
    const memberStyles = await (0, data_1.loadMemberStyles)();
    const candidatesByClass = new Map(activeClasses.map((session) => [
        session.id,
        (0, data_1.classCandidates)(session.id, bookings, memberStyles),
    ]));
    const [snoozes, alreadySent, alreadyResolved, tokens] = await Promise.all([
        (0, store_1.loadSnoozes)(db),
        (0, store_1.loadNotificationLog)(db),
        (0, store_1.loadResolvedConfirmations)(db),
        (0, store_1.listCoachTokens)(db),
    ]);
    const decisions = (0, scheduler_2.decideNotifications)({
        now,
        classes: activeClasses,
        candidatesByClass,
        snoozes,
        alreadySent,
        alreadyResolved,
    });
    for (const decision of decisions) {
        if (decision.type === "confirm") {
            await (0, store_1.markPendingConfirmation)(db, {
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
        await (0, store_1.recordNotification)(db, decision.key, {
            type: decision.type,
            classId: decision.classId,
            dayKey: decision.dayKey,
        });
    }
    const sent = await (0, fcm_1.sendDecisions)((0, messaging_1.getMessaging)(), tokens, decisions);
    return { sent };
}
//# sourceMappingURL=poller.js.map
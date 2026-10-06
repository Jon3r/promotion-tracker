"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDecisions = sendDecisions;
exports.fcmPayload = fcmPayload;
const scheduler_1 = require("./scheduler");
async function sendDecisions(messaging, tokens, decisions) {
    if (!tokens.length || !decisions.length)
        return 0;
    let sent = 0;
    for (const decision of decisions) {
        const { title, body, data } = fcmPayload(decision);
        try {
            await messaging.sendEachForMulticast({
                tokens,
                notification: { title, body },
                data,
                android: { priority: "high" },
            });
            sent += 1;
        }
        catch (error) {
            console.warn("FCM send failed", error);
        }
    }
    return sent;
}
function fcmPayload(decision) {
    if (decision.type === "class_ending") {
        return {
            title: `Promotions due · ${decision.title}`,
            body: (0, scheduler_1.classEndingBody)(decision.candidates),
            data: {
                type: "class_ending",
                eventId: decision.classId,
                dayKey: decision.dayKey,
            },
        };
    }
    return {
        title: "Did the stripe promotion happen?",
        body: (0, scheduler_1.confirmBody)(decision.candidate, decision.title),
        data: {
            type: "confirm",
            eventId: decision.classId,
            dayKey: decision.dayKey,
            contactKey: decision.candidate.contactKey,
        },
    };
}
//# sourceMappingURL=fcm.js.map
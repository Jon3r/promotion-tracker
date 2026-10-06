"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endingNotificationKey = endingNotificationKey;
exports.confirmNotificationKey = confirmNotificationKey;
exports.confirmDocId = confirmDocId;
exports.filterActiveCandidates = filterActiveCandidates;
exports.decideNotifications = decideNotifications;
exports.classEndingBody = classEndingBody;
exports.confirmBody = confirmBody;
const classes_1 = require("./clubworx/classes");
const stripeDue_1 = require("./eligibility/stripeDue");
function endingNotificationKey(eventId, dayKey) {
    return `${eventId}:${dayKey}:ending`;
}
function confirmNotificationKey(eventId, dayKey, contactKey) {
    return `${eventId}:${dayKey}:${contactKey}:confirm`;
}
function confirmDocId(eventId, dayKey, contactKey) {
    return `${eventId}_${dayKey}_${contactKey}`;
}
function filterActiveCandidates(candidates, snoozes, now) {
    return candidates.filter((c) => !(0, stripeDue_1.isSnoozed)(snoozes.get(c.contactKey) ?? null, now));
}
/**
 * Wave 1: class running or in the last 10 minutes — one push per class.
 * Wave 2: shortly after class end — one push per due person who was not delayed.
 */
function decideNotifications(args) {
    const decisions = [];
    for (const session of args.classes) {
        const dayKey = session.dayKey || (session.startsAt ? session.startsAt.slice(0, 10) : "");
        if (!dayKey || !session.id)
            continue;
        const raw = args.candidatesByClass.get(session.id) || [];
        const active = filterActiveCandidates(raw, args.snoozes, args.now);
        if (!active.length)
            continue;
        const endingKey = endingNotificationKey(session.id, dayKey);
        if (!args.alreadySent.has(endingKey) &&
            ((0, classes_1.classIsRunning)(session, args.now) || (0, classes_1.classIsAboutToFinish)(session, args.now))) {
            decisions.push({
                type: "class_ending",
                key: endingKey,
                classId: session.id,
                dayKey,
                title: session.title,
                candidates: active,
            });
        }
        if (!(0, classes_1.classHasEndedForConfirm)(session, args.now))
            continue;
        for (const candidate of active) {
            const confirmKey = confirmNotificationKey(session.id, dayKey, candidate.contactKey);
            const resolvedKey = confirmDocId(session.id, dayKey, candidate.contactKey);
            if (args.alreadySent.has(confirmKey))
                continue;
            if (args.alreadyResolved.has(resolvedKey))
                continue;
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
function classEndingBody(candidates) {
    const names = candidates
        .slice(0, 4)
        .map((c) => c.fullName)
        .join(", ");
    const extra = candidates.length > 4 ? ` +${candidates.length - 4} more` : "";
    return `${candidates.length} stripe promotion${candidates.length === 1 ? "" : "s"} due: ${names}${extra}`;
}
function confirmBody(candidate, classTitle) {
    return `Did ${candidate.fullName} get ${candidate.nextLabel} in ${classTitle}?`;
}
//# sourceMappingURL=scheduler.js.map
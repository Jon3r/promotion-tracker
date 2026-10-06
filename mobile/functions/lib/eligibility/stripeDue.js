"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_SNOOZE_DAYS = void 0;
exports.isDueForStripe = isDueForStripe;
exports.isParsedDueForStripe = isParsedDueForStripe;
exports.stripeAdvanceLabel = stripeAdvanceLabel;
exports.snoozeDocId = snoozeDocId;
exports.isSnoozed = isSnoozed;
exports.addDays = addDays;
const rank_1 = require("./rank");
/**
 * Stripe promotions only: same belt colour, next stripe count higher.
 * Missing current stripe count is treated as 0.
 * Belt-ups and "Ready to Promote" text without a same-belt stripe increase are excluded.
 */
function isDueForStripe(currentRank, nextRank) {
    const current = (0, rank_1.normaliseRank)(currentRank);
    const next = (0, rank_1.normaliseRank)(nextRank);
    return isParsedDueForStripe(current, next);
}
function isParsedDueForStripe(current, next) {
    if (current.belt === "unknown" || next.belt === "unknown")
        return false;
    if (current.belt !== next.belt)
        return false;
    const currentStripes = current.stripes ?? 0;
    if (next.stripes == null)
        return false;
    return next.stripes > currentStripes;
}
function stripeAdvanceLabel(currentRank, nextRank) {
    const current = (0, rank_1.normaliseRank)(currentRank);
    const next = (0, rank_1.normaliseRank)(nextRank);
    const from = current.stripes ?? 0;
    const to = next.stripes;
    const belt = (0, rank_1.beltDisplayName)(current.belt);
    if (to == null)
        return `${belt} stripe`;
    return `${belt} ${from} → ${to} stripe${to === 1 ? "" : "s"}`;
}
function snoozeDocId(contactKey, memberStyleId) {
    return `${contactKey}_${memberStyleId ?? "none"}`;
}
function isSnoozed(snoozeUntil, now) {
    if (!snoozeUntil)
        return false;
    return snoozeUntil.getTime() > now.getTime();
}
exports.ALLOWED_SNOOZE_DAYS = [7, 14, 21];
function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
//# sourceMappingURL=stripeDue.js.map
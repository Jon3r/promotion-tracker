"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidatesFromBookings = candidatesFromBookings;
exports.attachDueCounts = attachDueCounts;
const mapMember_1 = require("./mapMember");
const classes_1 = require("./classes");
const stripeDue_1 = require("../eligibility/stripeDue");
const rank_1 = require("../eligibility/rank");
function candidatesFromBookings(args) {
    const attendeeKeys = new Set(args.bookings
        .filter((b) => String(b.event_id ?? b.eventId ?? "") === args.eventId)
        .map(classes_1.bookingContactKey)
        .filter((k) => Boolean(k)));
    const out = [];
    for (const record of args.memberStyles) {
        const contactKey = String(record.contact_key || "").trim();
        if (!contactKey || !attendeeKeys.has(contactKey))
            continue;
        const currentRank = String(record.current_rank_name || "").trim();
        const nextRank = String(record.next_rank_name || "").trim();
        if (!(0, stripeDue_1.isDueForStripe)(currentRank, nextRank))
            continue;
        const audience = (0, mapMember_1.categoryFromStyleName)(record.style_name) ?? "adults";
        const firstName = String(record.contact_first_name || "").trim();
        const lastName = String(record.contact_last_name || "").trim();
        const memberStyleId = record.id != null ? Number(record.id) : null;
        out.push({
            contactKey,
            memberStyleId: Number.isFinite(memberStyleId) ? memberStyleId : null,
            firstName,
            lastName,
            fullName: [firstName, lastName].filter(Boolean).join(" ") || contactKey,
            currentRank,
            nextRank,
            currentLabel: (0, rank_1.normaliseRank)(currentRank).label,
            nextLabel: (0, rank_1.normaliseRank)(nextRank).label,
            audience,
        });
    }
    return out;
}
function attachDueCounts(classes, bookings, memberStyles) {
    return classes.map((session) => ({
        ...session,
        dueCount: candidatesFromBookings({
            bookings,
            memberStyles,
            eventId: session.id,
        }).length,
    }));
}
//# sourceMappingURL=roster.js.map
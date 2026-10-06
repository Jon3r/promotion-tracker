"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMemberStyles = loadMemberStyles;
exports.loadStyles = loadStyles;
exports.invalidateMemberStyles = invalidateMemberStyles;
exports.loadDayClasses = loadDayClasses;
exports.loadDaySchedule = loadDaySchedule;
exports.classCandidates = classCandidates;
const classes_1 = require("./clubworx/classes");
const client_1 = require("./clubworx/client");
const cache_1 = require("./clubworx/cache");
const roster_1 = require("./clubworx/roster");
const clubworx_1 = require("./mock/clubworx");
function dedupeClasses(classes) {
    const byKey = new Map();
    for (const entry of classes) {
        if (!entry.id && !entry.title)
            continue;
        const key = entry.startsAt
            ? `${entry.id}::${entry.startsAt}`
            : `${entry.id}::${entry.dayKey || ""}::${entry.title}`;
        const prev = byKey.get(key);
        if (!prev || (!prev.startsAt && entry.startsAt)) {
            byKey.set(key, entry);
        }
    }
    return [...byKey.values()].sort((a, b) => {
        const at = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
    });
}
const MEMBER_STYLES_KEY = "member_styles";
const STYLES_KEY = "styles";
function loadMemberStyles() {
    if (!(0, client_1.isClubWorxConfigured)())
        return Promise.resolve(clubworx_1.MOCK_MEMBER_STYLES);
    return (0, cache_1.cached)(MEMBER_STYLES_KEY, (0, cache_1.envTtlMs)("CLUBWORX_MEMBER_STYLES_TTL_MS", 15 * 60 * 1000), () => (0, client_1.fetchAllClubWorxPages)("member_styles"));
}
function loadStyles() {
    if (!(0, client_1.isClubWorxConfigured)())
        return Promise.resolve(clubworx_1.MOCK_STYLES);
    return (0, cache_1.cached)(STYLES_KEY, (0, cache_1.envTtlMs)("CLUBWORX_STYLES_TTL_MS", 6 * 60 * 60 * 1000), () => (0, client_1.fetchAllClubWorxPages)("styles").catch(() => []));
}
/** Call after writing a rank to ClubWorx so the next read sees it. */
function invalidateMemberStyles() {
    (0, cache_1.invalidateCache)(MEMBER_STYLES_KEY);
}
async function loadDayClasses(day) {
    if (!(0, client_1.isClubWorxConfigured)()) {
        return { classes: (0, clubworx_1.mockClassesForDay)(day), bookings: clubworx_1.MOCK_BOOKINGS };
    }
    return (0, cache_1.cached)(`day:${day}`, (0, cache_1.envTtlMs)("CLUBWORX_BOOKINGS_TTL_MS", 90 * 1000), () => fetchDayClasses(day));
}
async function loadDaySchedule(day) {
    const { classes, bookings } = await loadDayClasses(day);
    const memberStyles = await loadMemberStyles();
    return {
        classes: (0, roster_1.attachDueCounts)(classes, bookings, memberStyles),
        bookings,
        memberStyles,
        mock: !(0, client_1.isClubWorxConfigured)(),
    };
}
async function fetchDayClasses(day) {
    const candidates = (0, classes_1.buildDayParamCandidates)(day);
    const bookingsResult = await (0, client_1.fetchClubWorxPagesWithParamCandidates)("bookings", candidates);
    let bookings = [];
    if (bookingsResult.ok) {
        bookings = bookingsResult.rows.filter((row) => {
            const bookingDay = (0, classes_1.resolveClubWorxDayKey)(row);
            return !bookingDay || bookingDay === day;
        });
    }
    else {
        try {
            bookings = (await (0, client_1.fetchAllClubWorxPages)("bookings")).filter((row) => {
                const bookingDay = (0, classes_1.resolveClubWorxDayKey)(row);
                return !bookingDay || bookingDay === day;
            });
        }
        catch {
            bookings = [];
        }
    }
    let classes = [];
    const byId = new Map();
    for (const booking of bookings) {
        const normalized = (0, classes_1.normaliseClubWorxClassFromBooking)(booking);
        if (!normalized.id)
            continue;
        const key = normalized.startsAt
            ? `${normalized.id}::${normalized.startsAt}`
            : `${normalized.id}::${normalized.dayKey || ""}`;
        const previous = byId.get(key);
        if (!previous || (!previous.startsAt && normalized.startsAt)) {
            byId.set(key, normalized);
        }
    }
    classes = [...byId.values()];
    if (!classes.length) {
        const eventsResult = await (0, client_1.fetchClubWorxPagesWithParamCandidates)("events", candidates);
        if (eventsResult.ok) {
            classes = eventsResult.rows
                .filter((row) => {
                const eventDay = (0, classes_1.resolveClubWorxDayKey)(row);
                return !eventDay || eventDay === day;
            })
                .map(classes_1.normaliseClubWorxEvent)
                .filter((event) => event.id);
        }
    }
    return { classes: dedupeClasses(classes), bookings };
}
function classCandidates(eventId, bookings, memberStyles) {
    return (0, roster_1.candidatesFromBookings)({ bookings, memberStyles, eventId });
}
//# sourceMappingURL=data.js.map
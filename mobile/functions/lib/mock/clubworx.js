"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_BOOKINGS = exports.MOCK_MEMBER_STYLES = exports.MOCK_STYLES = void 0;
exports.mockClassesForDay = mockClassesForDay;
exports.mockCandidate = mockCandidate;
exports.mockCandidatesForClass = mockCandidatesForClass;
function isoAt(day, hour, minute) {
    return new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`).toISOString();
}
function mockClassesForDay(day) {
    return [
        {
            id: "kids-evening",
            title: "Kids BJJ",
            startsAt: isoAt(day, 6, 30),
            endsAt: isoAt(day, 7, 30),
            startsAtLabel: `${day} 16:30`,
            organisation: "Main Mats",
            audience: "kids",
            dayKey: day,
        },
        {
            id: "adults-evening",
            title: "Adults Gi",
            startsAt: isoAt(day, 8, 0),
            endsAt: isoAt(day, 9, 0),
            startsAtLabel: `${day} 18:00`,
            organisation: "Main Mats",
            audience: "adults",
            dayKey: day,
        },
    ];
}
function mockCandidate(partial) {
    const firstName = partial.firstName ?? "Student";
    const lastName = partial.lastName ?? "One";
    return {
        contactKey: partial.contactKey,
        memberStyleId: partial.memberStyleId ?? 101,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        currentRank: partial.currentRank ?? "White Belt 1 stripe",
        nextRank: partial.nextRank ?? "White Belt 2 stripe",
        currentLabel: partial.currentLabel ?? "White Belt · 1 stripe",
        nextLabel: partial.nextLabel ?? "White Belt · 2 stripes",
        audience: (partial.audience ?? "kids"),
    };
}
function mockCandidatesForClass(eventId) {
    if (eventId === "kids-evening") {
        return [
            mockCandidate({
                contactKey: "alice",
                memberStyleId: 11,
                firstName: "Alice",
                lastName: "Ng",
                currentRank: "Grey Belt 2 stripe",
                nextRank: "Grey Belt 3 stripe",
                currentLabel: "Grey Belt · 2 stripes",
                nextLabel: "Grey Belt · 3 stripes",
                audience: "kids",
            }),
            mockCandidate({
                contactKey: "ben",
                memberStyleId: 12,
                firstName: "Ben",
                lastName: "Cole",
                currentRank: "White Belt",
                nextRank: "White Belt 1 stripe",
                currentLabel: "White Belt",
                nextLabel: "White Belt · 1 stripe",
                audience: "kids",
            }),
        ];
    }
    if (eventId === "adults-evening") {
        return [
            mockCandidate({
                contactKey: "carol",
                memberStyleId: 21,
                firstName: "Carol",
                lastName: "Diaz",
                currentRank: "Purple Belt 3 stripe",
                nextRank: "Purple Belt 4 stripe",
                currentLabel: "Purple Belt · 3 stripes",
                nextLabel: "Purple Belt · 4 stripes",
                audience: "adults",
            }),
        ];
    }
    return [];
}
exports.MOCK_STYLES = [
    {
        id: "bjj-kids",
        name: "BJJ Kids",
        ranks: [
            { id: "kw0", name: "White Belt" },
            { id: "kw1", name: "White Belt 1 stripe" },
            { id: "kg2", name: "Grey Belt 2 stripe" },
            { id: "kg3", name: "Grey Belt 3 stripe" },
        ],
    },
    {
        id: "bjj-adults",
        name: "BJJ Adults",
        ranks: [
            { id: "ap3", name: "Purple Belt 3 stripe" },
            { id: "ap4", name: "Purple Belt 4 stripe" },
        ],
    },
];
exports.MOCK_MEMBER_STYLES = [
    {
        id: 11,
        contact_key: "alice",
        contact_first_name: "Alice",
        contact_last_name: "Ng",
        style_name: "BJJ Kids",
        current_rank_name: "Grey Belt 2 stripe",
        next_rank_name: "Grey Belt 3 stripe",
    },
    {
        id: 12,
        contact_key: "ben",
        contact_first_name: "Ben",
        contact_last_name: "Cole",
        style_name: "BJJ Kids",
        current_rank_name: "White Belt",
        next_rank_name: "White Belt 1 stripe",
    },
    {
        id: 13,
        contact_key: "dana",
        contact_first_name: "Dana",
        contact_last_name: "Beltup",
        style_name: "BJJ Kids",
        current_rank_name: "Grey Belt 4 stripe",
        next_rank_name: "Yellow/White Belt",
    },
    {
        id: 21,
        contact_key: "carol",
        contact_first_name: "Carol",
        contact_last_name: "Diaz",
        style_name: "BJJ Adults",
        current_rank_name: "Purple Belt 3 stripe",
        next_rank_name: "Purple Belt 4 stripe",
    },
    {
        id: 22,
        contact_key: "ed",
        contact_first_name: "Ed",
        contact_last_name: "Blue",
        style_name: "BJJ Adults",
        current_rank_name: "White Belt 4 stripe",
        next_rank_name: "Blue Belt",
    },
];
exports.MOCK_BOOKINGS = [
    { event_id: "kids-evening", contact_key: "alice" },
    { event_id: "kids-evening", contact_key: "ben" },
    { event_id: "kids-evening", contact_key: "dana" },
    { event_id: "adults-evening", contact_key: "carol" },
    { event_id: "adults-evening", contact_key: "ed" },
];
//# sourceMappingURL=clubworx.js.map
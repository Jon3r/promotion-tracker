"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_LABELS = exports.KIDS_BELT_ORDER = exports.ADULT_BELT_ORDER = void 0;
exports.normaliseRank = normaliseRank;
exports.beltDisplayName = beltDisplayName;
exports.beltSortIndex = beltSortIndex;
exports.ADULT_BELT_ORDER = [
    "white",
    "blue",
    "purple",
    "brown",
    "black",
];
exports.KIDS_BELT_ORDER = [
    "white",
    "greywhite",
    "grey",
    "greyblack",
    "yellowwhite",
    "yellow",
    "yellowblack",
    "orangewhite",
    "orange",
    "orangeblack",
    "greenwhite",
    "green",
    "greenblack",
];
const COMPOUND_BELT_KEYWORDS = [
    {
        key: "greywhite",
        patterns: [
            "grey/white",
            "grey white",
            "grey-white",
            "greywhite",
            "grey&white",
            "gray/white",
            "gray white",
            "gray-white",
            "graywhite",
        ],
    },
    {
        key: "greyblack",
        patterns: [
            "grey/black",
            "grey black",
            "grey-black",
            "greyblack",
            "gray/black",
            "gray black",
        ],
    },
    {
        key: "yellowwhite",
        patterns: ["yellow/white", "yellow white", "yellow-white", "yellowwhite"],
    },
    {
        key: "yellowblack",
        patterns: ["yellow/black", "yellow black", "yellow-black", "yellowblack"],
    },
    {
        key: "orangewhite",
        patterns: ["orange/white", "orange white", "orange-white", "orangewhite"],
    },
    {
        key: "orangeblack",
        patterns: ["orange/black", "orange black", "orange-black", "orangeblack"],
    },
    {
        key: "greenwhite",
        patterns: [
            "green/white",
            "green white",
            "green-white",
            "greenwhite",
            "green&white",
            "green & white",
        ],
    },
    {
        key: "greenblack",
        patterns: ["green/black", "green black", "green-black", "greenblack"],
    },
];
const SIMPLE_BELT_KEYWORDS = [
    { key: "purple", patterns: ["purple"] },
    { key: "brown", patterns: ["brown"] },
    { key: "black", patterns: ["black"] },
    { key: "white", patterns: ["white"] },
    { key: "blue", patterns: ["blue"] },
    { key: "grey", patterns: ["grey", "gray"] },
    { key: "yellow", patterns: ["yellow"] },
    { key: "orange", patterns: ["orange"] },
    { key: "green", patterns: ["green"] },
];
exports.STRIPE_LABELS = {
    white: "White",
    blue: "Blue",
    purple: "Purple",
    brown: "Brown",
    black: "Black",
    grey: "Grey",
    greywhite: "Grey/White",
    greyblack: "Grey/Black",
    yellow: "Yellow",
    yellowwhite: "Yellow/White",
    yellowblack: "Yellow/Black",
    orange: "Orange",
    orangewhite: "Orange/White",
    orangeblack: "Orange/Black",
    green: "Green",
    greenwhite: "Green/White",
    greenblack: "Green/Black",
    unknown: "Unknown",
};
function rankPatternMatches(normalised, pattern) {
    const p = pattern.replace(/\s+/g, " ");
    if (/[\s/\-&]/.test(p)) {
        return normalised.includes(p);
    }
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(normalised);
}
function normaliseRank(raw) {
    const original = raw == null ? "" : String(raw).trim();
    if (!original) {
        return { belt: "unknown", stripes: null, label: "Unknown", raw: original };
    }
    const normalised = original.toLowerCase().replace(/\s+/g, " ");
    let belt = "unknown";
    for (const { key, patterns } of COMPOUND_BELT_KEYWORDS) {
        if (patterns.some((p) => rankPatternMatches(normalised, p))) {
            belt = key;
            break;
        }
    }
    if (belt === "unknown") {
        for (const { key, patterns } of SIMPLE_BELT_KEYWORDS) {
            if (patterns.some((p) => rankPatternMatches(normalised, p))) {
                belt = key;
                break;
            }
        }
    }
    let stripes = null;
    const stripeMatch = normalised.match(/(\d)\s*stripe/);
    if (stripeMatch) {
        stripes = Number(stripeMatch[1]);
    }
    const beltLabel = exports.STRIPE_LABELS[belt] || belt;
    let label = beltLabel;
    if (stripes != null) {
        label = `${beltLabel} Belt · ${stripes} stripe${stripes === 1 ? "" : "s"}`;
    }
    else if (normalised.includes("belt")) {
        label = `${beltLabel} Belt`;
    }
    else {
        label = original;
    }
    return { belt, stripes, label, raw: original };
}
function beltDisplayName(belt) {
    return exports.STRIPE_LABELS[belt] || belt;
}
function beltSortIndex(belt, category) {
    const order = category === "kids" ? exports.KIDS_BELT_ORDER : exports.ADULT_BELT_ORDER;
    const idx = order.indexOf(belt);
    return idx === -1 ? 999 : idx;
}
//# sourceMappingURL=rank.js.map
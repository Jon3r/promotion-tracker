export const ADULT_BELT_ORDER = [
  "white",
  "blue",
  "purple",
  "brown",
  "black",
];

/** IBJJF kids belt keywords in display order */
export const KIDS_BELT_ORDER = [
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

const BELT_KEYWORDS = [
  { key: "greywhite", patterns: ["grey/white", "grey white", "gray/white", "gray white"] },
  { key: "greyblack", patterns: ["grey/black", "grey black", "gray/black", "gray black"] },
  { key: "yellowwhite", patterns: ["yellow/white", "yellow white"] },
  { key: "yellowblack", patterns: ["yellow/black", "yellow black"] },
  { key: "orangewhite", patterns: ["orange/white", "orange white"] },
  { key: "orangeblack", patterns: ["orange/black", "orange black"] },
  { key: "greenwhite", patterns: ["green/white", "green white"] },
  { key: "greenblack", patterns: ["green/black", "green black"] },
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

const STRIPE_LABELS = {
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

/**
 * @param {string|null|undefined} raw
 * @returns {{ belt: string, stripes: number|null, label: string, raw: string }}
 */
export function normaliseRank(raw) {
  const original = raw == null ? "" : String(raw).trim();
  if (!original) {
    return { belt: "unknown", stripes: null, label: "Unknown", raw: original };
  }

  const normalised = original.toLowerCase().replace(/\s+/g, " ");

  let belt = "unknown";
  for (const { key, patterns } of BELT_KEYWORDS) {
    if (patterns.some((p) => normalised.includes(p.replace(/\s+/g, " ")))) {
      belt = key;
      break;
    }
  }

  let stripes = null;
  const stripeMatch = normalised.match(/(\d)\s*stripe/);
  if (stripeMatch) {
    stripes = Number(stripeMatch[1]);
  }

  const beltLabel = STRIPE_LABELS[belt] || belt;
  let label = beltLabel;
  if (stripes != null) {
    label = `${beltLabel} Belt · ${stripes} stripe${stripes === 1 ? "" : "s"}`;
  } else if (normalised.includes("belt")) {
    label = `${beltLabel} Belt`;
  } else {
    label = original;
  }

  return { belt, stripes, label, raw: original };
}

/**
 * @param {string} belt
 * @param {'adults'|'kids'} category
 * @returns {number}
 */
export function beltSortIndex(belt, category) {
  const order = category === "kids" ? KIDS_BELT_ORDER : ADULT_BELT_ORDER;
  const idx = order.indexOf(belt);
  return idx === -1 ? 999 : idx;
}

/**
 * @param {string} belt
 * @returns {string}
 */
export function beltDisplayName(belt) {
  return STRIPE_LABELS[belt] || belt;
}

/**
 * Tailwind accent classes per belt (header border / chip).
 * @param {string} belt
 */
export function beltAccentClass(belt) {
  const map = {
    white: "border-zinc-300 bg-zinc-50",
    blue: "border-blue-500 bg-blue-50",
    purple: "border-purple-600 bg-purple-50",
    brown: "border-amber-900 bg-amber-50",
    black: "border-zinc-900 bg-zinc-100",
    grey: "border-zinc-400 bg-zinc-100",
    greywhite: "border-zinc-400 bg-zinc-50",
    greyblack: "border-zinc-600 bg-zinc-100",
    yellow: "border-yellow-500 bg-yellow-50",
    yellowwhite: "border-yellow-400 bg-yellow-50",
    yellowblack: "border-yellow-600 bg-yellow-50",
    orange: "border-orange-500 bg-orange-50",
    orangewhite: "border-orange-400 bg-orange-50",
    orangeblack: "border-orange-600 bg-orange-50",
    green: "border-green-600 bg-green-50",
    greenwhite: "border-green-400 bg-green-50",
    greenblack: "border-green-700 bg-green-50",
    unknown: "border-red-400 bg-red-50",
  };
  return map[belt] || map.unknown;
}

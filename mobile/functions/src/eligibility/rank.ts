export const ADULT_BELT_ORDER = [
  "white",
  "blue",
  "purple",
  "brown",
  "black",
] as const;

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
] as const;

const COMPOUND_BELT_KEYWORDS: { key: string; patterns: string[] }[] = [
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

const SIMPLE_BELT_KEYWORDS: { key: string; patterns: string[] }[] = [
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

export const STRIPE_LABELS: Record<string, string> = {
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

export type ParsedRank = {
  belt: string;
  stripes: number | null;
  label: string;
  raw: string;
};

function rankPatternMatches(normalised: string, pattern: string): boolean {
  const p = pattern.replace(/\s+/g, " ");
  if (/[\s/\-&]/.test(p)) {
    return normalised.includes(p);
  }
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(normalised);
}

export function normaliseRank(raw: string | null | undefined): ParsedRank {
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

  let stripes: number | null = null;
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

export function beltDisplayName(belt: string): string {
  return STRIPE_LABELS[belt] || belt;
}

export function beltSortIndex(belt: string, category: "adults" | "kids"): number {
  const order = category === "kids" ? KIDS_BELT_ORDER : ADULT_BELT_ORDER;
  const idx = (order as readonly string[]).indexOf(belt);
  return idx === -1 ? 999 : idx;
}

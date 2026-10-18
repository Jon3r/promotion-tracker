import { beltDisplayName, normaliseRank, type ParsedRank } from "./rank";

export type Audience = "kids" | "adults";

export type StripeCandidate = {
  contactKey: string;
  memberStyleId: number | null;
  firstName: string;
  lastName: string;
  fullName: string;
  currentRank: string;
  nextRank: string;
  currentLabel: string;
  nextLabel: string;
  audience: Audience;
};

/**
 * Stripe promotions only: same belt colour, next stripe count higher.
 * Missing current stripe count is treated as 0.
 * Belt-ups and "Ready to Promote" text without a same-belt stripe increase are excluded.
 */
export function isDueForStripe(
  currentRank: string | null | undefined,
  nextRank: string | null | undefined
): boolean {
  const current = normaliseRank(currentRank);
  const next = normaliseRank(nextRank);
  return isParsedDueForStripe(current, next);
}

export function isParsedDueForStripe(current: ParsedRank, next: ParsedRank): boolean {
  if (current.belt === "unknown" || next.belt === "unknown") return false;
  if (current.belt !== next.belt) return false;
  const currentStripes = current.stripes ?? 0;
  if (next.stripes == null) return false;
  return next.stripes > currentStripes;
}

export function stripeAdvanceLabel(currentRank: string, nextRank: string): string {
  const current = normaliseRank(currentRank);
  const next = normaliseRank(nextRank);
  const from = current.stripes ?? 0;
  const to = next.stripes;
  const belt = beltDisplayName(current.belt);
  if (to == null) return `${belt} stripe`;
  return `${belt} ${from} → ${to} stripe${to === 1 ? "" : "s"}`;
}

export function snoozeDocId(contactKey: string, memberStyleId: number | null): string {
  return `${contactKey}_${memberStyleId ?? "none"}`;
}

export function isSnoozed(snoozeUntil: Date | null | undefined, now: Date): boolean {
  if (!snoozeUntil) return false;
  return snoozeUntil.getTime() > now.getTime();
}

export const ALLOWED_SNOOZE_DAYS = [7, 14, 21] as const;
export type SnoozeDays = (typeof ALLOWED_SNOOZE_DAYS)[number];

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

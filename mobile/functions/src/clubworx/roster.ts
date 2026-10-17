import { categoryFromStyleName } from "./mapMember";
import { bookingContactKey, type ClassSession } from "./classes";
import { isDueForStripe, type StripeCandidate } from "../eligibility/stripeDue";
import { normaliseRank } from "../eligibility/rank";

export function candidatesFromBookings(args: {
  bookings: Record<string, unknown>[];
  memberStyles: Record<string, unknown>[];
  eventId: string;
}): StripeCandidate[] {
  const attendeeKeys = new Set(
    args.bookings
      .filter((b) => String(b.event_id ?? b.eventId ?? "") === args.eventId)
      .map(bookingContactKey)
      .filter((k): k is string => Boolean(k))
  );

  const out: StripeCandidate[] = [];
  for (const record of args.memberStyles) {
    const contactKey = String(record.contact_key || "").trim();
    if (!contactKey || !attendeeKeys.has(contactKey)) continue;

    const currentRank = String(record.current_rank_name || "").trim();
    const nextRank = String(record.next_rank_name || "").trim();
    if (!isDueForStripe(currentRank, nextRank)) continue;

    const audience = categoryFromStyleName(record.style_name) ?? "adults";
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
      currentLabel: normaliseRank(currentRank).label,
      nextLabel: normaliseRank(nextRank).label,
      audience,
    });
  }
  return out;
}

export function attachDueCounts(
  classes: ClassSession[],
  bookings: Record<string, unknown>[],
  memberStyles: Record<string, unknown>[]
): ClassSession[] {
  return classes.map((session) => ({
    ...session,
    dueCount: candidatesFromBookings({
      bookings,
      memberStyles,
      eventId: session.id,
    }).length,
  }));
}

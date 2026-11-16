import { bookingContactKey } from "./classes";

/**
 * @param {Record<string, unknown>} booking
 * @returns {{ firstName: string, lastName: string, fullName: string }}
 */
export function bookingDisplayName(booking) {
  const nested = /** @type {Record<string, unknown>|undefined} */ (
    booking?.contact
  );
  const firstName = String(
    booking?.contact_first_name ||
      booking?.first_name ||
      nested?.first_name ||
      ""
  ).trim();
  const lastName = String(
    booking?.contact_last_name ||
      booking?.last_name ||
      nested?.last_name ||
      ""
  ).trim();
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    String(booking?.contact_name || nested?.name || "").trim();

  return { firstName, lastName, fullName };
}

/**
 * @param {Record<string, unknown>} booking
 * @returns {string|null}
 */
export function bookingCheckedInAt(booking) {
  const raw =
    booking?.checked_in_at ||
    booking?.attended_at ||
    booking?.updated_at ||
    booking?.created_at ||
    null;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const d = new Date(String(raw));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * @param {Record<string, unknown>[]} bookings
 * @param {Map<string, { firstName?: string, lastName?: string, fullName?: string }>} [rosterByKey]
 * @returns {Array<{ contactKey: string, firstName: string, lastName: string, fullName: string, checkedInAt: string|null }>}
 */
export function bookingsToAttendees(bookings, rosterByKey = new Map()) {
  /** @type {Map<string, { contactKey: string, firstName: string, lastName: string, fullName: string, checkedInAt: string|null }>} */
  const byKey = new Map();

  for (const booking of bookings || []) {
    const contactKey = bookingContactKey(booking);
    if (!contactKey) continue;

    const fromBooking = bookingDisplayName(booking);
    const fromRoster = rosterByKey.get(contactKey);
    const firstName =
      fromBooking.firstName || String(fromRoster?.firstName || "").trim();
    const lastName =
      fromBooking.lastName || String(fromRoster?.lastName || "").trim();
    const fullName =
      fromBooking.fullName ||
      String(fromRoster?.fullName || "").trim() ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      "Member";
    const checkedInAt = bookingCheckedInAt(booking);

    const existing = byKey.get(contactKey);
    if (!existing) {
      byKey.set(contactKey, {
        contactKey,
        firstName,
        lastName,
        fullName,
        checkedInAt,
      });
      continue;
    }

    if (
      checkedInAt &&
      (!existing.checkedInAt ||
        new Date(checkedInAt).getTime() >
          new Date(existing.checkedInAt).getTime())
    ) {
      existing.checkedInAt = checkedInAt;
    }
    if (!existing.fullName || existing.fullName === "Member") {
      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.fullName = fullName;
    }
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.checkedInAt && b.checkedInAt) {
      return (
        new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
      );
    }
    if (a.checkedInAt && !b.checkedInAt) return -1;
    if (!a.checkedInAt && b.checkedInAt) return 1;
    return a.fullName.localeCompare(b.fullName, undefined, {
      sensitivity: "base",
    });
  });
}

/**
 * @param {Record<string, unknown>} event
 * @returns {{ id: string, title: string, startsAt: string|null, startsAtLabel: string }}
 */
export function normaliseClubWorxEvent(event) {
  const id = String(
    event?.id ??
      event?.event_id ??
      event?.class_id ??
      event?.schedule_id ??
      ""
  ).trim();
  const title =
    String(event?.name || event?.title || event?.event_name || "").trim() ||
    `Class ${id}`;
  const startsAtRaw =
    String(
      event?.starts_at ||
        event?.start_at ||
        event?.start_time ||
        event?.event_starts_at ||
        ""
    ).trim() || null;
  const startsAtDate = startsAtRaw ? new Date(startsAtRaw) : null;
  const startsAt =
    startsAtDate && Number.isFinite(startsAtDate.getTime())
      ? startsAtDate.toISOString()
      : null;

  const startsAtLabel = startsAt
    ? new Date(startsAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Time TBA";

  return {
    id,
    title,
    startsAt,
    startsAtLabel,
  };
}

/**
 * Build class option from a bookings row when events endpoint is unavailable.
 * @param {Record<string, unknown>} booking
 * @returns {{ id: string, title: string, startsAt: string|null, startsAtLabel: string }}
 */
export function normaliseClubWorxClassFromBooking(booking) {
  const nestedEvent = /** @type {Record<string, unknown>|undefined} */ (
    booking?.event
  );
  const eventLike = {
    id:
      booking?.event_id ??
      booking?.eventId ??
      nestedEvent?.id ??
      nestedEvent?.event_id ??
      booking?.id ??
      null,
    name:
      booking?.event_name ||
      booking?.eventName ||
      nestedEvent?.name ||
      nestedEvent?.title ||
      nestedEvent?.event_name ||
      "",
    starts_at:
      booking?.event_starts_at ||
      booking?.event_start_time ||
      booking?.starts_at ||
      nestedEvent?.starts_at ||
      nestedEvent?.start_at ||
      nestedEvent?.start_time ||
      null,
  };
  return normaliseClubWorxEvent(eventLike);
}

/**
 * @param {Record<string, unknown>} booking
 * @returns {string|null}
 */
export function bookingContactKey(booking) {
  const direct = String(booking?.contact_key || "").trim();
  if (direct) return direct;

  const nested = /** @type {Record<string, unknown>|undefined} */ (
    booking?.contact
  );
  const nestedKey = String(nested?.contact_key || "").trim();
  if (nestedKey) return nestedKey;

  return null;
}


/**
 * @param {Record<string, unknown>} event
 * @returns {{ id: string, title: string, startsAt: string|null, startsAtLabel: string }}
 */
export function normaliseClubWorxEvent(event) {
  const id = String(event?.id ?? "").trim();
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


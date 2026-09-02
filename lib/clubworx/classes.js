/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanString(value) {
  return String(value ?? "").trim();
}

/**
 * @param {Record<string, unknown>} source
 * @param {string[]} keys
 * @returns {unknown}
 */
function firstValue(source, keys) {
  for (const key of keys) {
    if (source[key] != null && source[key] !== "") return source[key];
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {Date|null}
 */
function parseDateish(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const raw = cleanString(value);
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isFinite(d.getTime())) return d;

  return null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {Date|null}
 */
function resolveClubWorxStartsAt(event) {
  const directDateTime = parseDateish(
    firstValue(event, [
      "starts_at",
      "start_at",
      "start_time",
      "event_starts_at",
      "event_start_at",
      "event_start_time",
      "start_datetime",
      "event_start_datetime",
      "event_starts",
      "starts",
      "datetime",
    ])
  );
  if (directDateTime) return directDateTime;

  const datePart = cleanString(
    firstValue(event, [
      "event_date",
      "start_date",
      "event_start_date",
      "event_starts_on",
      "starts_on",
      "date",
    ])
  );
  const timePart = cleanString(
    firstValue(event, ["event_start_time", "start_time", "time"])
  );

  if (datePart && timePart) {
    const merged = parseDateish(`${datePart} ${timePart}`);
    if (merged) return merged;
  }
  if (datePart) {
    const dateOnly = parseDateish(datePart);
    if (dateOnly) return dateOnly;
  }
  if (timePart) {
    const mergedToday = parseDateish(`${new Date().toISOString().slice(0, 10)} ${timePart}`);
    if (mergedToday) return mergedToday;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {{ id: string, title: string, startsAt: string|null, startsAtLabel: string }}
 */
export function normaliseClubWorxEvent(event) {
  const id = cleanString(
    event?.id ??
      event?.event_id ??
      event?.class_id ??
      event?.schedule_id
  );
  const title =
    cleanString(event?.name || event?.title || event?.event_name) ||
    `Class ${id}`;
  const startsAtDate = resolveClubWorxStartsAt(event);
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
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function isoDateTime(date) {
  return date.toISOString();
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function startOfWeekMonday(date) {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 (Sun) ... 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}

/**
 * @param {string|undefined} raw
 * @param {number} fallback
 * @returns {number}
 */
function envInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

/**
 * ClubWorx accounts may require both event_starts_after and event_ends_before.
 * @param {Date} [now]
 */
export function buildClubWorxScheduleWindowParams(now = new Date()) {
  const pastDays = envInt(process.env.CLUBWORX_EVENTS_DAYS_PAST, 7);
  const futureDays = envInt(process.env.CLUBWORX_EVENTS_DAYS_FUTURE, 90);
  const start = addDays(now, -pastDays);
  const end = addDays(now, futureDays);
  return {
    event_starts_after: isoDate(start),
    event_ends_before: isoDate(end),
  };
}

/**
 * Current week (Monday -> next Monday) window for class selector.
 * @param {Date} [now]
 */
export function buildClubWorxCurrentWeekWindowParams(now = new Date()) {
  const start = startOfWeekMonday(now);
  const end = addDays(start, 7);
  return {
    event_starts_after: isoDate(start),
    event_ends_before: isoDate(end),
  };
}

/**
 * Some ClubWorx accounts use different filter names or datetime formats.
 * Try variants before failing class loading.
 * @param {{ start: Date, end: Date }} window
 * @returns {Record<string, string>[]}
 */
function buildWindowParamCandidates(window) {
  const { start, end } = window;
  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const startDateTime = isoDateTime(start);
  const endDateTime = isoDateTime(end);

  const candidates = [
    {
      event_starts_after: startDate,
      event_ends_before: endDate,
    },
    {
      event_starts_after: startDateTime,
      event_ends_before: endDateTime,
    },
    {
      starts_after: startDate,
      ends_before: endDate,
    },
    {
      starts_after: startDateTime,
      ends_before: endDateTime,
    },
  ];

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = JSON.stringify(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

/**
 * @param {Date} [now]
 * @returns {Record<string, string>[]}
 */
export function buildClubWorxScheduleWindowParamCandidates(now = new Date()) {
  const pastDays = envInt(process.env.CLUBWORX_EVENTS_DAYS_PAST, 7);
  const futureDays = envInt(process.env.CLUBWORX_EVENTS_DAYS_FUTURE, 90);
  const start = addDays(now, -pastDays);
  const end = addDays(now, futureDays);
  return buildWindowParamCandidates({ start, end });
}

/**
 * @param {Date} [now]
 * @returns {Record<string, string>[]}
 */
export function buildClubWorxCurrentWeekParamCandidates(now = new Date()) {
  const start = startOfWeekMonday(now);
  const end = addDays(start, 7);
  return buildWindowParamCandidates({ start, end });
}

/**
 * @param {Date} [now]
 * @returns {Record<string, string>[]}
 */
export function buildClubWorxClassSelectorParamCandidates(now = new Date()) {
  const mode = String(process.env.CLUBWORX_CLASS_SELECTOR_WINDOW || "week")
    .trim()
    .toLowerCase();
  if (mode === "rolling") {
    return buildClubWorxScheduleWindowParamCandidates(now);
  }
  return buildClubWorxCurrentWeekParamCandidates(now);
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


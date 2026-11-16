/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanString(value) {
  return String(value ?? "").trim();
}

/**
 * @param {string} raw
 * @returns {string|null}
 */
function extractIsoDay(raw) {
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Gym wall-clock timezone for ClubWorx schedules (Parramatta).
 * Override with CLUBWORX_TIMEZONE when needed.
 * @returns {string}
 */
export function getClubWorxTimeZone() {
  return process.env.CLUBWORX_TIMEZONE?.trim() || "Australia/Sydney";
}

/**
 * @param {Date} date
 * @param {string} [timeZone]
 * @returns {string} YYYY-MM-DD in the gym timezone
 */
export function dayKeyInTimeZone(date, timeZone = getClubWorxTimeZone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
function getTimeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  /** @type {Record<string, string>} */
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Convert a gym-local wall time to a UTC Date.
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {string} [timeZone]
 * @returns {Date}
 */
export function wallTimeToUtc(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone = getClubWorxTimeZone()
) {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcMs = desiredAsUtc;
  for (let i = 0; i < 3; i += 1) {
    const parts = getTimeZoneParts(new Date(utcMs), timeZone);
    const asWallUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    utcMs += desiredAsUtc - asWallUtc;
  }
  return new Date(utcMs);
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
 * Parse ClubWorx date/time values. Naive (no Z/offset) strings are treated as
 * gym-local wall time in Australia/Sydney so evening classes are not shifted.
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

  // Absolute timestamps keep their explicit offset / Z.
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return wallTimeToUtc(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3]),
      0,
      0,
      0
    );
  }

  const dateTime = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (dateTime) {
    return wallTimeToUtc(
      Number(dateTime[1]),
      Number(dateTime[2]),
      Number(dateTime[3]),
      Number(dateTime[4]),
      Number(dateTime[5]),
      Number(dateTime[6] || 0)
    );
  }

  // Time-only values are not complete datetimes.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) return null;

  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

const DATE_FIELD_KEYS = [
  "event_date",
  "start_date",
  "event_start_date",
  "event_starts_on",
  "starts_on",
  "date",
];

const TIME_FIELD_KEYS = ["event_start_time", "start_time", "time"];

const DATETIME_FIELD_KEYS = [
  "starts_at",
  "start_at",
  "event_starts_at",
  "event_start_at",
  "start_datetime",
  "event_start_datetime",
  "event_starts",
  "starts",
  "datetime",
  // These are often full datetimes, but may also be clock-only ("18:15").
  "event_start_time",
  "start_time",
];

/**
 * @param {string} raw
 * @returns {boolean}
 */
function isClockTimeOnly(raw) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(raw) && !/\d{4}-\d{2}-\d{2}/.test(raw);
}

/**
 * @param {Record<string, unknown>} event
 * @returns {Date|null}
 */
function resolveClubWorxStartsAt(event) {
  for (const key of DATETIME_FIELD_KEYS) {
    const value = event?.[key];
    if (value == null || value === "") continue;
    if (typeof value === "number") {
      const parsedNumber = parseDateish(value);
      if (parsedNumber) return parsedNumber;
      continue;
    }
    const raw = cleanString(value);
    if (!raw || isClockTimeOnly(raw)) continue;
    const parsed = parseDateish(raw);
    if (parsed) return parsed;
  }

  const datePart = cleanString(firstValue(event, DATE_FIELD_KEYS));
  const timePart = cleanString(
    TIME_FIELD_KEYS.map((key) => event?.[key]).find((value) => {
      const raw = cleanString(value);
      return raw && isClockTimeOnly(raw);
    })
  );

  if (datePart && timePart) {
    const day = extractIsoDay(datePart) || datePart;
    const merged = parseDateish(`${day} ${timePart}`);
    if (merged) return merged;
  }
  if (datePart) {
    const dateOnly = parseDateish(datePart);
    if (dateOnly) return dateOnly;
  }
  if (timePart) {
    const today = dayKeyInTimeZone(new Date());
    const mergedToday = parseDateish(`${today} ${timePart}`);
    if (mergedToday) return mergedToday;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {Date|null}
 */
function resolveClubWorxStartDateOnly(event) {
  const dateRaw = cleanString(firstValue(event, DATE_FIELD_KEYS));
  if (!dateRaw) return null;
  return parseDateish(dateRaw);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function isoDay(date) {
  return dayKeyInTimeZone(date);
}

/**
 * Calendar day for an event in the gym timezone.
 * Prefers explicit ClubWorx date fields; otherwise derives from startsAt.
 * @param {Record<string, unknown>} event
 * @returns {string|null}
 */
export function resolveClubWorxDayKey(event) {
  const dateRaw = cleanString(firstValue(event, DATE_FIELD_KEYS));
  const rawDay = dateRaw ? extractIsoDay(dateRaw) : null;
  if (rawDay) return rawDay;

  const startsAt = resolveClubWorxStartsAt(event);
  if (startsAt) return dayKeyInTimeZone(startsAt);

  // Naive date embedded in a datetime string (no reliable TZ) — last resort.
  const startsAtRaw = cleanString(firstValue(event, DATETIME_FIELD_KEYS));
  if (startsAtRaw && !/([zZ]|[+-]\d{2}:?\d{2})$/.test(startsAtRaw)) {
    const embedded = extractIsoDay(startsAtRaw);
    if (embedded) return embedded;
  }

  const dateOnly = resolveClubWorxStartDateOnly(event);
  if (dateOnly) return dayKeyInTimeZone(dateOnly);
  return null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {string|null}
 */
function resolveClubWorxStartDateLabel(event) {
  const parsed = resolveClubWorxStartDateOnly(event);
  if (parsed) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const dateRaw = cleanString(
    firstValue(event, [
      "event_date",
      "start_date",
      "event_start_date",
      "event_starts_on",
      "starts_on",
      "date",
    ])
  );
  return dateRaw || null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {string}
 */
function resolveClubWorxOrganisation(event) {
  const org = cleanString(
    firstValue(event, [
      "location_name",
      "location",
      "venue_name",
      "venue",
      "organisation_name",
      "organization_name",
      "gym_name",
      "business_name",
      "site_name",
    ])
  );
  return org || "Unknown location";
}

/**
 * @param {string} title
 * @param {string} organisation
 * @returns {"kids"|"adults"}
 */
function inferClassAudience(title, organisation) {
  const text = `${title} ${organisation}`.toLowerCase();
  if (/\bkids?\b|\bchildren\b|\blittle kids\b|\bbig kids\b/.test(text)) {
    return "kids";
  }
  return "adults";
}

/** Default class length when ClubWorx omits an end time. */
export const DEFAULT_CLASS_DURATION_MS = 60 * 60 * 1000;

/** Switch the check-in display to the next class this many ms before it starts. */
export const CLASS_ADVANCE_MS = 10 * 60 * 1000;

/**
 * @param {Record<string, unknown>} event
 * @param {Date|null} startsAt
 * @returns {Date|null}
 */
function resolveClubWorxEndsAt(event, startsAt) {
  const direct = parseDateish(
    firstValue(event, [
      "ends_at",
      "end_at",
      "end_time",
      "event_ends_at",
      "event_end_at",
      "event_end_time",
      "end_datetime",
      "event_end_datetime",
      "event_ends",
      "ends",
    ])
  );
  if (direct) return direct;

  const durationRaw = firstValue(event, [
    "duration_minutes",
    "duration_mins",
    "duration",
    "length_minutes",
  ]);
  if (startsAt && durationRaw != null && durationRaw !== "") {
    const n = Number(durationRaw);
    if (Number.isFinite(n) && n > 0) {
      const minutes = n > 24 * 60 ? n / 60 : n;
      return new Date(startsAt.getTime() + minutes * 60 * 1000);
    }
  }

  if (startsAt) {
    return new Date(startsAt.getTime() + DEFAULT_CLASS_DURATION_MS);
  }
  return null;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {{ id: string, title: string, startsAt: string|null, endsAt: string|null, startsAtLabel: string, organisation: string, audience: "kids"|"adults", dayKey: string|null }}
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
  const organisation = resolveClubWorxOrganisation(event);
  const startsAtDate = resolveClubWorxStartsAt(event);
  const endsAtDate = resolveClubWorxEndsAt(event, startsAtDate);
  const startsAt =
    startsAtDate && Number.isFinite(startsAtDate.getTime())
      ? startsAtDate.toISOString()
      : null;
  const endsAt =
    endsAtDate && Number.isFinite(endsAtDate.getTime())
      ? endsAtDate.toISOString()
      : null;
  const startDateLabel = resolveClubWorxStartDateLabel(event);

  const startsAtLabel = startsAt
    ? new Date(startsAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : startDateLabel
      ? `${startDateLabel} · Time TBA`
      : "Date/Time TBA";

  return {
    id,
    title,
    startsAt,
    endsAt,
    startsAtLabel,
    organisation,
    audience: inferClassAudience(title, organisation),
    dayKey: resolveClubWorxDayKey(event),
  };
}

/**
 * Pick the class the check-in screen should show.
 * Class C_i displays from C_i.startsAt - 10m until C_{i+1}.startsAt - 10m
 * (or until C_i.endsAt when there is no next class).
 *
 * @param {Array<{ id: string, title: string, startsAt: string|null, endsAt?: string|null, startsAtLabel?: string }>} classes
 * @param {Date} [now]
 * @returns {{ class: object|null, nextClass: object|null, status: "live"|"upcoming"|"idle"|"empty" }}
 */
export function pickDisplayedClass(classes, now = new Date()) {
  const timed = (classes || [])
    .filter((c) => c?.startsAt)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

  if (!timed.length) {
    return { class: null, nextClass: null, status: "empty" };
  }

  const t = now.getTime();

  for (let i = 0; i < timed.length; i += 1) {
    const current = timed[i];
    const next = timed[i + 1] || null;
    const start = new Date(current.startsAt).getTime();
    const displayStart = start - CLASS_ADVANCE_MS;
    const displayEnd = next
      ? new Date(next.startsAt).getTime() - CLASS_ADVANCE_MS
      : current.endsAt
        ? new Date(current.endsAt).getTime()
        : start + DEFAULT_CLASS_DURATION_MS;

    if (t >= displayStart && t < displayEnd) {
      return {
        class: current,
        nextClass: next,
        status: t < start ? "upcoming" : "live",
      };
    }
  }

  // Any class that has not started yet (including >10 minutes away).
  const upcoming = timed.find((c) => new Date(c.startsAt).getTime() > t);
  return {
    class: null,
    nextClass: upcoming || null,
    status: "idle",
  };
}

/**
 * Keep classes that belong on the gym-local calendar day.
 * @param {Array<{ dayKey?: string|null, startsAt?: string|null }>} classes
 * @param {string} day YYYY-MM-DD in gym timezone
 */
export function filterClassesForDay(classes, day) {
  if (!day) return classes || [];
  return (classes || []).filter((entry) => {
    if (entry?.dayKey && entry.dayKey === day) return true;
    if (entry?.startsAt) {
      return dayKeyInTimeZone(new Date(entry.startsAt)) === day;
    }
    return false;
  });
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
 * @param {string} day ISO yyyy-mm-dd
 * @returns {{ start: Date, end: Date }|null}
 */
function dayWindowFromIsoDate(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime())) return null;
  const end = addDays(start, 1);
  return { start, end };
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
 * @param {string} day ISO yyyy-mm-dd
 * @returns {Record<string, string>[]}
 */
export function buildClubWorxDayParamCandidates(day) {
  const window = dayWindowFromIsoDate(day);
  if (!window) return [];
  return buildWindowParamCandidates(window);
}

/**
 * Build class option from a bookings row when events endpoint is unavailable.
 * @param {Record<string, unknown>} booking
 * @returns {{ id: string, title: string, startsAt: string|null, endsAt: string|null, startsAtLabel: string, organisation: string, audience: "kids"|"adults", dayKey: string|null }}
 */
export function normaliseClubWorxClassFromBooking(booking) {
  const nestedEvent = /** @type {Record<string, unknown>|undefined} */ (
    booking?.event
  );
  const nestedLocation = /** @type {Record<string, unknown>|undefined} */ (
    booking?.location
  );
  const eventLike = {
    id:
      booking?.event_id ??
      booking?.eventId ??
      booking?.schedule_event_id ??
      booking?.class_id ??
      booking?.schedule_id ??
      nestedEvent?.id ??
      nestedEvent?.event_id ??
      nestedEvent?.class_id ??
      nestedEvent?.schedule_id ??
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
    ends_at:
      booking?.event_ends_at ||
      nestedEvent?.ends_at ||
      nestedEvent?.end_at ||
      null,
    duration_minutes:
      booking?.duration_minutes ||
      nestedEvent?.duration_minutes ||
      nestedEvent?.duration ||
      null,
    event_starts_on:
      booking?.event_starts_on ||
      booking?.event_date ||
      nestedEvent?.event_starts_on ||
      nestedEvent?.event_date ||
      nestedEvent?.start_date ||
      null,
    location_name:
      booking?.location_name ||
      nestedEvent?.location_name ||
      nestedLocation?.name ||
      nestedLocation?.title ||
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


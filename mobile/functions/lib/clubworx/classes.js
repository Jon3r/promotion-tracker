"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_WINDOW_AFTER_END_MS = exports.CONFIRM_DELAY_AFTER_END_MS = exports.ABOUT_TO_FINISH_MS = exports.DEFAULT_CLASS_DURATION_MS = void 0;
exports.resolveClubWorxStartsAt = resolveClubWorxStartsAt;
exports.resolveClubWorxEndsAt = resolveClubWorxEndsAt;
exports.resolveClubWorxDayKey = resolveClubWorxDayKey;
exports.inferClassAudience = inferClassAudience;
exports.normaliseClubWorxEvent = normaliseClubWorxEvent;
exports.normaliseClubWorxClassFromBooking = normaliseClubWorxClassFromBooking;
exports.bookingContactKey = bookingContactKey;
exports.isoDay = isoDay;
exports.buildDayParamCandidates = buildDayParamCandidates;
exports.classIsRunning = classIsRunning;
exports.classIsAboutToFinish = classIsAboutToFinish;
exports.classHasEndedForConfirm = classHasEndedForConfirm;
exports.classInNotificationWindow = classInNotificationWindow;
function cleanString(value) {
    return String(value ?? "").trim();
}
function extractIsoDay(raw) {
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}
function firstValue(source, keys) {
    for (const key of keys) {
        if (source[key] != null && source[key] !== "")
            return source[key];
    }
    return null;
}
function parseDateish(value) {
    if (value == null || value === "")
        return null;
    if (typeof value === "number") {
        const ms = value > 1e12 ? value : value * 1000;
        const d = new Date(ms);
        return Number.isFinite(d.getTime()) ? d : null;
    }
    const raw = cleanString(value);
    if (!raw)
        return null;
    const d = new Date(raw);
    return Number.isFinite(d.getTime()) ? d : null;
}
const START_KEYS = [
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
];
const DATE_KEYS = [
    "event_date",
    "start_date",
    "event_start_date",
    "event_starts_on",
    "starts_on",
    "date",
];
const END_KEYS = [
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
];
exports.DEFAULT_CLASS_DURATION_MS = 60 * 60 * 1000;
exports.ABOUT_TO_FINISH_MS = 10 * 60 * 1000;
exports.CONFIRM_DELAY_AFTER_END_MS = 2 * 60 * 1000;
exports.NOTIFICATION_WINDOW_AFTER_END_MS = 30 * 60 * 1000;
function resolveClubWorxStartsAt(event) {
    const directDateTime = parseDateish(firstValue(event, START_KEYS));
    if (directDateTime)
        return directDateTime;
    const datePart = cleanString(firstValue(event, DATE_KEYS));
    const timePart = cleanString(firstValue(event, ["event_start_time", "start_time", "time"]));
    if (datePart && timePart) {
        const merged = parseDateish(`${datePart} ${timePart}`);
        if (merged)
            return merged;
    }
    if (datePart) {
        const dateOnly = parseDateish(datePart);
        if (dateOnly)
            return dateOnly;
    }
    return null;
}
function resolveClubWorxEndsAt(event, startsAt) {
    const direct = parseDateish(firstValue(event, END_KEYS));
    if (direct)
        return direct;
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
        return new Date(startsAt.getTime() + exports.DEFAULT_CLASS_DURATION_MS);
    }
    return null;
}
function resolveClubWorxDayKey(event) {
    const dateRaw = cleanString(firstValue(event, DATE_KEYS));
    const rawDay = dateRaw ? extractIsoDay(dateRaw) : null;
    if (rawDay)
        return rawDay;
    const startsAtRaw = cleanString(firstValue(event, START_KEYS));
    const startsAtRawDay = startsAtRaw ? extractIsoDay(startsAtRaw) : null;
    if (startsAtRawDay)
        return startsAtRawDay;
    const startsAt = resolveClubWorxStartsAt(event);
    if (startsAt)
        return startsAt.toISOString().slice(0, 10);
    return null;
}
function resolveOrganisation(event) {
    const org = cleanString(firstValue(event, [
        "location_name",
        "location",
        "venue_name",
        "venue",
        "organisation_name",
        "organization_name",
        "gym_name",
        "business_name",
        "site_name",
    ]));
    return org || "Unknown location";
}
function inferClassAudience(title, organisation) {
    const text = `${title} ${organisation}`.toLowerCase();
    if (/\bkids?\b|\bchildren\b|\blittle kids\b|\bbig kids\b/.test(text)) {
        return "kids";
    }
    return "adults";
}
function normaliseClubWorxEvent(event) {
    const id = cleanString(event.id ?? event.event_id ?? event.class_id ?? event.schedule_id);
    const title = cleanString(event.name || event.title || event.event_name) || `Class ${id}`;
    const organisation = resolveOrganisation(event);
    const startsAtDate = resolveClubWorxStartsAt(event);
    const endsAtDate = resolveClubWorxEndsAt(event, startsAtDate);
    const startsAt = startsAtDate && Number.isFinite(startsAtDate.getTime())
        ? startsAtDate.toISOString()
        : null;
    const endsAt = endsAtDate && Number.isFinite(endsAtDate.getTime()) ? endsAtDate.toISOString() : null;
    const startsAtLabel = startsAt
        ? new Date(startsAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
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
function normaliseClubWorxClassFromBooking(booking) {
    const nestedEvent = booking.event;
    const nestedLocation = booking.location;
    const eventLike = {
        id: booking.event_id ??
            booking.eventId ??
            booking.schedule_event_id ??
            booking.class_id ??
            booking.schedule_id ??
            nestedEvent?.id ??
            nestedEvent?.event_id ??
            nestedEvent?.class_id ??
            nestedEvent?.schedule_id ??
            null,
        name: booking.event_name ||
            booking.eventName ||
            nestedEvent?.name ||
            nestedEvent?.title ||
            nestedEvent?.event_name ||
            "",
        starts_at: booking.event_starts_at ||
            booking.event_start_time ||
            booking.starts_at ||
            nestedEvent?.starts_at ||
            nestedEvent?.start_at ||
            nestedEvent?.start_time ||
            null,
        ends_at: booking.event_ends_at || nestedEvent?.ends_at || nestedEvent?.end_at || null,
        duration_minutes: booking.duration_minutes || nestedEvent?.duration_minutes || nestedEvent?.duration || null,
        event_starts_on: booking.event_starts_on ||
            booking.event_date ||
            nestedEvent?.event_starts_on ||
            nestedEvent?.event_date ||
            nestedEvent?.start_date ||
            null,
        location_name: booking.location_name ||
            nestedEvent?.location_name ||
            nestedLocation?.name ||
            nestedLocation?.title ||
            null,
    };
    return normaliseClubWorxEvent(eventLike);
}
function bookingContactKey(booking) {
    const direct = String(booking.contact_key || "").trim();
    if (direct)
        return direct;
    const nested = booking.contact;
    const nestedKey = String(nested?.contact_key || "").trim();
    return nestedKey || null;
}
function isoDay(date) {
    return date.toISOString().slice(0, 10);
}
function buildDayParamCandidates(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
        return [];
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    const startDate = isoDay(start);
    const endDate = isoDay(end);
    return [
        { event_starts_after: startDate, event_ends_before: endDate },
        { event_starts_after: start.toISOString(), event_ends_before: end.toISOString() },
        { starts_after: startDate, ends_before: endDate },
    ];
}
function classIsRunning(session, now) {
    if (!session.startsAt || !session.endsAt)
        return false;
    const start = new Date(session.startsAt).getTime();
    const end = new Date(session.endsAt).getTime();
    const t = now.getTime();
    return t >= start && t < end;
}
function classIsAboutToFinish(session, now) {
    if (!session.endsAt)
        return false;
    const end = new Date(session.endsAt).getTime();
    const t = now.getTime();
    return t >= end - exports.ABOUT_TO_FINISH_MS && t < end;
}
function classHasEndedForConfirm(session, now) {
    if (!session.endsAt)
        return false;
    const end = new Date(session.endsAt).getTime();
    return now.getTime() >= end + exports.CONFIRM_DELAY_AFTER_END_MS;
}
/** True while the poller may still need to send a push for this class. */
function classInNotificationWindow(session, now) {
    if (!session.endsAt)
        return false;
    const end = new Date(session.endsAt).getTime();
    const start = session.startsAt ? new Date(session.startsAt).getTime() : end - exports.ABOUT_TO_FINISH_MS;
    const t = now.getTime();
    return t >= Math.min(start, end - exports.ABOUT_TO_FINISH_MS) && t < end + exports.NOTIFICATION_WINDOW_AFTER_END_MS;
}
//# sourceMappingURL=classes.js.map
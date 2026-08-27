/**
 * Parses a "YYYY-MM-DD" (or any Date-constructible) value into a Date at LOCAL
 * midnight of the calendar day it represents.
 *
 * A plain date-only string like "2026-08-27" is parsed by `new Date()` as UTC
 * midnight per the ECMAScript spec. On a server running in a timezone with a
 * negative UTC offset (e.g. US Eastern), that UTC instant falls on the previous
 * LOCAL calendar day — so a naive `d.setHours(0,0,0,0)` normalization would
 * silently roll the date back by one. Rebuilding the Date from the UTC Y/M/D
 * components (which are exactly what the caller typed) as LOCAL components
 * sidesteps that: it's correct regardless of the server's timezone offset, and
 * matches how Attendance.date / dashboard "today" are computed (local midnight).
 */
const parseDateOnly = (value) => {
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

module.exports = { parseDateOnly };

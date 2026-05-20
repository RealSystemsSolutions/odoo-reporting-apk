/**
 * Odoo Date Utilities
 *
 * PROBLEM: Odoo always stores and returns datetimes in UTC, but sends them as
 * plain strings WITHOUT a timezone suffix, e.g. "2026-05-19 23:00:00".
 *
 * When JavaScript's `new Date()` receives a string without a timezone it
 * interprets it as **local time** (ISO 8601 behaviour for date-only strings),
 * causing every date to appear shifted by the user's UTC offset.
 *
 * Example for a user at UTC-4:
 *   Odoo sends   → "2026-05-20 03:00:00"   (UTC, midnight local = 04:00 UTC,
 *                                            but this order was placed at 23:00
 *                                            local the day before)
 *   new Date()   → treats as local → 2026-05-20 03:00 local (WRONG)
 *   parseOdooDate() → appends 'Z' → 2026-05-19 23:00 local (CORRECT)
 *
 * SOLUTION: append 'Z' before parsing so JS treats the string as UTC.
 */

/**
 * Parses an Odoo datetime string (UTC, no suffix) into a local JavaScript Date.
 * Handles both "YYYY-MM-DD HH:MM:SS" and already-valid ISO strings.
 */
export function parseOdooDate(dateStr: string | false | null | undefined): Date | null {
  if (!dateStr) return null;

  // Replace the space separator with 'T' and append 'Z' to signal UTC
  const iso = dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(iso);

  // Guard against invalid dates
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns the local calendar date string "YYYY-MM-DD" for grouping purposes.
 * Using 'en-CA' locale gives ISO-like "YYYY-MM-DD" format.
 */
export function odooDateToLocalKey(dateStr: string | false | null | undefined): string {
  const d = parseOdooDate(dateStr);
  if (!d) return '';
  // 'en-CA' always returns YYYY-MM-DD regardless of device locale
  return d.toLocaleDateString('en-CA');
}

/**
 * Formats an Odoo datetime string for display (date + time in device locale).
 * Returns "May 19, 2026" style by default.
 */
export function formatOdooDate(
  dateStr: string | false | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' },
): string {
  const d = parseOdooDate(dateStr);
  if (!d) return 'N/A';
  return d.toLocaleDateString(undefined, options);
}

/**
 * Formats an Odoo datetime string showing only the local time (HH:MM).
 */
export function formatOdooTime(dateStr: string | false | null | undefined): string {
  const d = parseOdooDate(dateStr);
  if (!d) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Formats an Odoo datetime as "YYYY-MM-DD HH:MM" in local time.
 * Useful for compact display in cards.
 */
export function formatOdooDateTime(dateStr: string | false | null | undefined): string {
  const d = parseOdooDate(dateStr);
  if (!d) return 'N/A';
  const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

/**
 * Converts a local "YYYY-MM-DD" date key back to a displayable long format.
 * E.g. "2026-05-19" → "Monday, May 19, 2026"
 * NOTE: append 'T00:00:00' (no 'Z') so it is treated as local midnight.
 */
export function formatLocalDateKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
): string {
  if (!dateKey) return 'Unknown Date';
  const d = new Date(dateKey + 'T00:00:00'); // local midnight
  return isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString(undefined, options);
}

/**
 * Builds a UTC datetime string suitable for Odoo domain filters.
 * Receives a LOCAL Date (e.g. start of local day) and converts to UTC
 * string that Odoo understands: "YYYY-MM-DD HH:MM:SS".
 */
export function toOdooDomainDate(localDate: Date): string {
  return localDate.toISOString().replace('T', ' ').substring(0, 19);
}

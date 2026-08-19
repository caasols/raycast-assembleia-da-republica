/**
 * Date handling for openAR, which speaks `AAAA-MM-DD` and means Lisbon.
 */

/**
 * Parliament sits in Lisbon, so "today" is today *there* — not on the machine
 * running Raycast. A user in São Paulo or Tokyo asking what was voted today
 * must get the same sitting day a user in Lisbon gets; deriving the date from
 * the local clock would silently show the wrong day, or an empty list, for
 * anyone west of UTC in the evening or east of it in the morning.
 */
export const PARLIAMENT_TIME_ZONE = "Europe/Lisbon";

/**
 * Today's date in Lisbon, as the `AAAA-MM-DD` the API expects.
 *
 * `now` is injectable so this is testable without freezing the system clock.
 */
export function todayInLisbon(now: Date = new Date()): string {
  return toLisbonDateString(now);
}

function toLisbonDateString(instant: Date): string {
  // formatToParts rather than a locale whose format merely looks like ISO:
  // reading the parts by name cannot be reordered by a locale or an ICU build.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: PARLIAMENT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Render an openAR date for display, in English to match the rest of the UI.
 *
 * Returns null for a missing or unparseable date so a caller decides what to
 * show, rather than this inventing "Invalid Date" or a misleading epoch.
 */
export function formatVoteDate(isoDate: string | null): string | null {
  if (!isoDate) {
    return null;
  }
  // Parsed as UTC midnight deliberately: the value is a calendar date with no
  // time, and letting the local zone shift it can move it to the day before.
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

/**
 * A date for display, falling back to the raw `AAAA-MM-DD` when it cannot be
 * formatted.
 *
 * Views need a string unconditionally — "no votes on null" is not a sentence —
 * but the fallback belongs here rather than at each call site, where it would
 * be an untestable branch on a state the caller cannot produce.
 */
export function displayDate(isoDate: string): string {
  return formatVoteDate(isoDate) ?? isoDate;
}

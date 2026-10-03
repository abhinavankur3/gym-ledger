import { cookies } from "next/headers";

export const TZ_COOKIE = "tz";

/** The viewer's IANA time zone, synced from the browser by <TimezoneSync />. Falls back to UTC. */
export async function getUserTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch {
      // Ignore an invalid cookie value and fall through to UTC.
    }
  }
  return "UTC";
}

function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday as string,
  };
}

/** YYYY-MM-DD for the given instant in the user's zone. */
export function localDateKey(date: Date | string, timeZone: string) {
  const { year, month, day } = zonedParts(new Date(date), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Local hour (0-23) in the user's zone. */
export function localHour(date: Date, timeZone: string) {
  return zonedParts(date, timeZone).hour;
}

/** Day of week in the user's zone, 0 = Monday ... 6 = Sunday (matches routine_days.dayOfWeek). */
export function localWeekday(date: Date, timeZone: string) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(zonedParts(date, timeZone).weekday);
}

/** Zone offset (ms, local minus UTC) at a given instant. */
function offsetAt(ms: number, timeZone: string) {
  const p = zonedParts(new Date(ms), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * UTC instant of local midnight on a calendar date. Uses the offset *at* that
 * midnight (re-checked once), so DST change days land on the right hour.
 */
function localMidnightMs(year: number, month: number, day: number, timeZone: string) {
  const wall = Date.UTC(year, month - 1, day);
  let guess = wall - offsetAt(wall, timeZone);
  guess = wall - offsetAt(guess, timeZone);
  return guess;
}

/** UTC ISO timestamp of the most recent local midnight, for comparing against stored ISO timestamps. */
export function startOfLocalDayIso(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return new Date(localMidnightMs(p.year, p.month, p.day, timeZone)).toISOString();
}

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** UTC ISO timestamp of local midnight on this week's Monday. */
export function startOfLocalWeekIso(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  // Calendar arithmetic (not 24 h steps), so a DST change mid-week can't skip a day
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - weekday));
  return new Date(localMidnightMs(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), timeZone)).toISOString();
}

/** YYYY-MM-DD for the local calendar day `daysAgo` days before `date`. */
export function localDateKeyDaysAgo(date: Date, daysAgo: number, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day - daysAgo));
  return d.toISOString().split("T")[0];
}

/** e.g. "Thursday, 2 October" in the user's zone. */
export function formatLocalLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(date);
}

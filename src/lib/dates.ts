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

/** UTC ISO timestamp of the most recent local midnight, for comparing against stored ISO timestamps. */
export function startOfLocalDayIso(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const offsetMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offsetMs).toISOString();
}

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** UTC ISO timestamp of local midnight on this week's Monday. */
export function startOfLocalWeekIso(date: Date, timeZone: string) {
  const weekday = localWeekday(date, timeZone);
  return startOfLocalDayIso(new Date(date.getTime() - weekday * 24 * 60 * 60 * 1000), timeZone);
}

/** e.g. "Thursday, 2 October" in the user's zone. */
export function formatLocalLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(date);
}

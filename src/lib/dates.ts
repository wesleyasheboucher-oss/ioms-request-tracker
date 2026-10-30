import { TIMEZONE } from "./config";

// All work dates are "YYYY-MM-DD" strings in the team's timezone.

export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parse(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function format(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

export function isWeekday(iso: string) {
  const day = parse(iso).getUTCDay();
  return day !== 0 && day !== 6;
}

// Monday of the week containing `iso`.
export function weekStartOf(iso: string) {
  const day = parse(iso).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}

export function isValidISODate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s).getTime());
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return parse(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export function formatTime(timestamp: string | Date) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

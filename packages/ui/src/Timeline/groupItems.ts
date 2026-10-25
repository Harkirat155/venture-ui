import type { TimelineItem } from './Timeline.js';

/**
 * A `time` string, read once for grouping, display and naming so they cannot disagree.
 * - `date`: a bare `YYYY-MM-DD`. A calendar day, with no time of day and no zone, so no zone can move it.
 * - `instant`: anything else that parses (ISO 8601 with an offset or `Z`). A moment, which falls on different calendar days in different zones.
 */
export type ParsedTime =
  | { kind: 'date'; year: number; month: number; day: number; iso: string }
  | { kind: 'instant'; date: Date; iso: string };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The parsed time, or undefined when it does not parse. An impossible date such as `2026-02-30` does not parse. */
export function parseTime(time: string): ParsedTime | undefined {
  const match = DATE_ONLY.exec(time);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    // Date.parse rolls 2026-02-30 over to March 2; a round trip through a UTC date catches it.
    const check = utcDate({ year, month, day }, 0);
    const isReal = check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
    return isReal ? { kind: 'date', year, month, day, iso: time } : undefined;
  }
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? undefined : { kind: 'instant', date, iso: date.toISOString() };
}

/** `timeZone` when the platform knows it, else undefined (the viewer's own zone). */
export function knownTimeZone(timeZone: string | undefined): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

export type TimelineGroup = {
  /** Calendar day as YYYY-MM-DD, or `unknown` when an item's time does not parse. */
  key: string;
  /**
   * Noon UTC on that calendar day, so formatting it with `timeZone: 'UTC'` prints the day whatever the viewer's
   * zone and whatever daylight saving does. Undefined for the `unknown` group.
   */
  date: Date | undefined;
  items: readonly TimelineItem[];
};

export type CalendarDay = { year: number; month: number; day: number };

/** The calendar day of a parsed time: a date as written, an instant as it falls in the zone `parts` was built for. */
function calendarDay(time: ParsedTime, parts: Intl.DateTimeFormat): CalendarDay {
  if (time.kind === 'date') return time;
  const fields = parts.formatToParts(time.date);
  const field = (type: string) => Number(fields.find((f) => f.type === type)?.value);
  return { year: field('year'), month: field('month'), day: field('day') };
}

function utcDate({ year, month, day }: CalendarDay, hour: number): Date {
  const date = new Date(Date.UTC(2000, month - 1, day, hour));
  date.setUTCFullYear(year); // Date.UTC reads years 0 to 99 as 1900 to 1999
  return date;
}

/** Noon UTC on a calendar day: formatting it with `timeZone: 'UTC'` prints that day in any viewer zone. */
export function noonUtc(day: CalendarDay): Date {
  return utcDate(day, 12);
}

function groupOf(day: CalendarDay) {
  const key = [String(day.year).padStart(4, '0'), String(day.month).padStart(2, '0'), String(day.day).padStart(2, '0')].join('-');
  return { key, date: noonUtc(day) };
}

/**
 * Splits items into runs that share a calendar day, keeping the caller's order. A date-only time is that
 * day in every zone; an instant is the day it falls on in `timeZone` (the viewer's zone by default). Items are
 * not sorted: an out-of-order list yields a repeated day rather than a silent reorder. Items whose time does not
 * parse share an `unknown` run.
 */
export function groupByDay(items: readonly TimelineItem[], timeZone?: string): TimelineGroup[] {
  // One formatter for the whole feed: building one per item is the slow part on a long list.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  const groups: { key: string; date: Date | undefined; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const parsed = parseTime(item.time);
    const day = parsed ? groupOf(calendarDay(parsed, parts)) : undefined;
    const key = day?.key ?? 'unknown';
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date: day?.date, items: [item] });
  }
  return groups;
}

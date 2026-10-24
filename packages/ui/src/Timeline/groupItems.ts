import type { TimelineItem } from './Timeline.js';

export type TimelineGroup = {
  /** Local calendar day as YYYY-MM-DD, or `unknown` when an item's time does not parse. */
  key: string;
  /** Midnight of the day in the viewer's zone; undefined for the `unknown` group. */
  date: Date | undefined;
  items: readonly TimelineItem[];
};

/** The local calendar day of an ISO 8601 time, or undefined when it does not parse. */
function localDay(time: string): { key: string; date: Date } | undefined {
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const date = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const key = [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return { key, date };
}

/**
 * Splits items into runs that share a local calendar day, keeping the caller's order. Items are not
 * sorted: an out-of-order list yields a repeated day rather than a silent reorder. Items whose time
 * does not parse share an `unknown` run.
 */
export function groupByLocalDay(items: readonly TimelineItem[]): TimelineGroup[] {
  const groups: { key: string; date: Date | undefined; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const day = localDay(item.time);
    const key = day?.key ?? 'unknown';
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date: day?.date, items: [item] });
  }
  return groups;
}

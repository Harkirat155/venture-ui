import { describe, expect, it } from 'vitest';
import { groupByDay, knownTimeZone, parseTime } from './groupItems.js';
import type { TimelineItem } from './Timeline.js';

const item = (id: string, time: string): TimelineItem => ({ id, time, title: id });

describe('parseTime', () => {
  it('reads a bare date as a calendar day and anything with a time as a moment', () => {
    expect(parseTime('2026-03-02')).toEqual({ kind: 'date', year: 2026, month: 3, day: 2, iso: '2026-03-02' });
    expect(parseTime('2026-03-02T09:30:00Z')).toMatchObject({ kind: 'instant', iso: '2026-03-02T09:30:00.000Z' });
    expect(parseTime('2026-03-02T15:00:00+05:30')).toMatchObject({ kind: 'instant', iso: '2026-03-02T09:30:00.000Z' });
  });

  it('reads a date with stray whitespace as the same calendar day, not as a moment', () => {
    // new Date(' 2026-03-02 ') is local midnight, which a chosen time zone would then move to another day.
    expect(parseTime(' 2026-03-02\n')).toEqual({ kind: 'date', year: 2026, month: 3, day: 2, iso: '2026-03-02' });
    expect(groupByDay([item('a', '2026-03-02 ')], 'Pacific/Auckland').map((g) => g.key)).toEqual(['2026-03-02']);
    expect(groupByDay([item('a', '2026-03-02 ')], 'Pacific/Honolulu').map((g) => g.key)).toEqual(['2026-03-02']);
  });

  it('rejects dates that do not exist instead of rolling them over', () => {
    for (const bad of ['2026-02-30', '2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-01-00']) {
      expect(parseTime(bad)).toBeUndefined();
    }
    expect(parseTime('2024-02-29')).toMatchObject({ kind: 'date', day: 29 });
  });

  it('rejects text that is not a time', () => {
    for (const bad of ['', 'not a date', 'yesterday', '2026']) expect(parseTime(bad)?.kind).not.toBe('date');
    expect(parseTime('not a date')).toBeUndefined();
    expect(parseTime('')).toBeUndefined();
  });
});

describe('knownTimeZone', () => {
  it('keeps a zone the platform knows and drops anything else', () => {
    expect(knownTimeZone('America/New_York')).toBe('America/New_York');
    expect(knownTimeZone('UTC')).toBe('UTC');
    expect(knownTimeZone('Nowhere/Land')).toBeUndefined();
    expect(knownTimeZone('')).toBeUndefined();
    expect(knownTimeZone(undefined)).toBeUndefined();
  });
});

describe('groupByDay with an explicit zone (independent of the process zone)', () => {
  // 03:30Z on 2 March is 22:30 on the 1st in New York and 09:00 on the 2nd in Kolkata.
  const moments = [item('a', '2026-03-02T03:30:00Z'), item('b', '2026-03-02T20:00:00Z')];

  it('splits the same moments differently in different zones', () => {
    expect(groupByDay(moments, 'America/New_York').map((g) => [g.key, g.items.length])).toEqual([
      ['2026-03-01', 1],
      ['2026-03-02', 1],
    ]);
    expect(groupByDay(moments, 'Asia/Kolkata').map((g) => [g.key, g.items.length])).toEqual([
      ['2026-03-02', 1],
      ['2026-03-03', 1],
    ]);
    expect(groupByDay(moments, 'UTC').map((g) => [g.key, g.items.length])).toEqual([['2026-03-02', 2]]);
  });

  it('keeps a date-only day on its own day in every zone', () => {
    for (const zone of ['Pacific/Honolulu', 'America/New_York', 'UTC', 'Asia/Kolkata', 'Pacific/Kiritimati']) {
      expect(groupByDay([item('d', '2026-03-02')], zone).map((g) => g.key)).toEqual(['2026-03-02']);
    }
  });

  it('gives each group noon UTC of its day, so formatting it in UTC prints that day', () => {
    const [group] = groupByDay([item('d', '2026-03-02')], 'Pacific/Kiritimati');
    expect(group?.date?.toISOString()).toBe('2026-03-02T12:00:00.000Z');
  });

  it('follows daylight saving: a moment 30 minutes before and after the clocks change stay on one day', () => {
    // New York springs forward at 07:00Z on 2026-03-08.
    const around = [item('a', '2026-03-08T06:30:00Z'), item('b', '2026-03-08T07:30:00Z')];
    expect(groupByDay(around, 'America/New_York').map((g) => g.key)).toEqual(['2026-03-08']);
  });

  it('falls back to the viewer\'s zone for a name it does not know, instead of throwing', () => {
    expect(() => groupByDay([item('a', '2026-03-02T03:30:00Z')], 'Nowhere/Land')).not.toThrow();
    expect(groupByDay([item('a', '2026-03-02T03:30:00Z')], 'Nowhere/Land')).toEqual(groupByDay([item('a', '2026-03-02T03:30:00Z')]));
  });

  it('keeps the order given and puts unparseable times in one unknown run', () => {
    const groups = groupByDay([item('a', '2026-03-02'), item('b', 'x'), item('c', '2026-02-30'), item('d', '2026-03-02')], 'UTC');
    expect(groups.map((g) => g.key)).toEqual(['2026-03-02', 'unknown', '2026-03-02']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(groups[1]?.date).toBeUndefined();
  });

  it('handles years under 100 without reading them as 19xx', () => {
    const [group] = groupByDay([item('d', '0099-03-02')]);
    expect(group?.key).toBe('0099-03-02');
    expect(group?.date?.getUTCFullYear()).toBe(99);
  });

  it('groups a long feed quickly', () => {
    const feed = Array.from({ length: 5000 }, (_, i) => item(String(i), new Date(Date.UTC(2026, 0, 1, 0, i * 20)).toISOString()));
    const start = performance.now();
    const groups = groupByDay(feed, 'Asia/Kolkata');
    expect(performance.now() - start).toBeLessThan(2000);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(5000);
  });
});

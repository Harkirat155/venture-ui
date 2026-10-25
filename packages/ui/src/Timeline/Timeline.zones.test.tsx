import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Timeline, type TimelineItem } from './Timeline.js';

afterEach(cleanup);

/** Runs `fn` with the process time zone (the viewer's zone) set to `zone`, then restores it. */
function inViewerZone<T>(zone: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    // A green test must mean what it says: fail loudly if the switch did not take. ICU may report an alias
    // (Asia/Kolkata as Asia/Calcutta), so compare the default zone with the named one as ICU resolves each.
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone,
    );
    return fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

const headings = () => screen.getAllByRole('heading').map((h) => h.textContent);

// 2026-03-02T03:30Z is still the evening of the 1st in New York (22:30 EST) and already the morning of the 2nd in Kolkata (09:00).
const NEAR_MIDNIGHT = '2026-03-02T03:30:00Z';

describe.each([
  ['America/New_York', 'Sunday, March 1, 2026'],
  ['Asia/Kolkata', 'Monday, March 2, 2026'],
])('in the viewer\'s zone %s', (zone, dayOfNearMidnight) => {
  it('files a date-only time under its own calendar day, never shifted by the zone', () => {
    inViewerZone(zone, () => {
      render(
        <Timeline
          groupBy="day"
          items={[
            { id: 'a', time: '2026-03-02', title: 'Planned' },
            { id: 'b', time: '2026-03-01', title: 'Earlier' },
          ]}
        />,
      );
      expect(headings()).toEqual(['Monday, March 2, 2026', 'Sunday, March 1, 2026']);
    });
  });

  it('shows a date-only time as that date, with no clock time, and keeps YYYY-MM-DD in <time datetime>', () => {
    inViewerZone(zone, () => {
      const { container } = render(<Timeline items={[{ id: 'a', time: '2026-03-02', title: 'Planned' }]} />);
      const time = container.querySelector('time');
      expect(time?.getAttribute('datetime')).toBe('2026-03-02');
      expect(time?.textContent).toBe('Mar 2, 2026');
    });
  });

  it('files an instant under the viewer\'s own day', () => {
    inViewerZone(zone, () => {
      render(<Timeline groupBy="day" items={[{ id: 'a', time: NEAR_MIDNIGHT, title: 'Deploy' }]} />);
      expect(headings()).toEqual([dayOfNearMidnight]);
    });
  });

  it('groups a date-only day and an instant by their own days, which differ only where the zone says so', () => {
    inViewerZone(zone, () => {
      render(
        <Timeline
          groupBy="day"
          items={[
            { id: 'a', time: '2026-03-02', title: 'Planned' },
            { id: 'b', time: NEAR_MIDNIGHT, title: 'Deploy' },
          ]}
        />,
      );
      expect(headings()).toEqual(
        dayOfNearMidnight.startsWith('Monday') ? ['Monday, March 2, 2026'] : ['Monday, March 2, 2026', dayOfNearMidnight],
      );
    });
  });
});

describe('Timeline timeZone prop (the process zone is UTC)', () => {
  it('groups and labels instants in the given zone', () => {
    const items: TimelineItem[] = [{ id: 'a', time: NEAR_MIDNIGHT, title: 'Deploy' }];
    const ny = render(<Timeline groupBy="day" timeZone="America/New_York" items={items} />);
    expect(headings()).toEqual(['Sunday, March 1, 2026']);
    expect(ny.container.querySelector('time')?.textContent).toMatch(/^10:30\sPM\sEST$/);
    ny.unmount();
    const kolkata = render(<Timeline groupBy="day" timeZone="Asia/Kolkata" items={items} />);
    expect(headings()).toEqual(['Monday, March 2, 2026']);
    expect(kolkata.container.querySelector('time')?.textContent).toMatch(/^9:00\sAM\sGMT\+5:30$/);
  });

  it('shows the date and the time with the zone name in a flat list, and keeps the instant in <time datetime>', () => {
    const { container } = render(
      <Timeline timeZone="America/New_York" items={[{ id: 'a', time: NEAR_MIDNIGHT, title: 'Deploy' }]} />,
    );
    const time = container.querySelector('time');
    expect(time?.textContent).toMatch(/^Mar 1, 2026, 10:30\sPM\sEST$/);
    expect(new Date(time?.getAttribute('datetime') ?? '').toISOString()).toBe('2026-03-02T03:30:00.000Z');
  });

  it('does not move a date-only time, whatever the zone', () => {
    for (const timeZone of ['Pacific/Honolulu', 'Pacific/Auckland', 'Asia/Kolkata']) {
      const { unmount } = render(
        <Timeline groupBy="day" timeZone={timeZone} items={[{ id: 'a', time: '2026-03-02', title: 'Planned' }]} />,
      );
      expect(headings()).toEqual(['Monday, March 2, 2026']);
      unmount();
    }
  });

  it('falls back to the viewer\'s zone for a name it does not know, instead of throwing', () => {
    render(<Timeline groupBy="day" timeZone="Nowhere/Land" items={[{ id: 'a', time: NEAR_MIDNIGHT, title: 'Deploy' }]} />);
    expect(headings()).toEqual(['Monday, March 2, 2026']);
  });

  it('changes the grouping when the zone changes', () => {
    const items: TimelineItem[] = [{ id: 'a', time: NEAR_MIDNIGHT, title: 'Deploy' }];
    const { rerender } = render(<Timeline groupBy="day" timeZone="Asia/Kolkata" items={items} />);
    expect(headings()).toEqual(['Monday, March 2, 2026']);
    rerender(<Timeline groupBy="day" timeZone="America/New_York" items={items} />);
    expect(headings()).toEqual(['Sunday, March 1, 2026']);
  });
});

describe('Timeline date-only times under a day heading', () => {
  it('add no time of their own: the heading already says the day', () => {
    const { container } = render(<Timeline groupBy="day" items={[{ id: 'a', time: '2026-03-02', title: 'Planned' }]} />);
    expect(headings()).toEqual(['Monday, March 2, 2026']);
    expect(container.querySelector('time')).toBeNull();
  });
});

describe('Timeline times that do not parse', () => {
  it('treats an impossible calendar date as unparseable, not as the next month', () => {
    // V8 rolls 2026-02-30 over to March 2; Timeline must not.
    const { container } = render(<Timeline groupBy="day" items={[{ id: 'a', time: '2026-02-30', title: 'Odd' }]} />);
    expect(headings()).toEqual(['Unknown date']);
    expect(screen.getByText('2026-02-30')).toBeTruthy();
    expect(container.querySelector('time')).toBeNull();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    render(
      <Timeline
        groupBy="day"
        items={[
          { id: 'a', time: '2024-02-29', title: 'Leap' },
          { id: 'b', time: '2026-02-29', title: 'Not leap' },
        ]}
      />,
    );
    expect(headings()).toEqual(['Thursday, February 29, 2024', 'Unknown date']);
  });
});

describe('Timeline disclosure button for an item whose title has no text', () => {
  const blank = <svg aria-hidden="true" width="1" height="1" />;
  const items: TimelineItem[] = [
    { id: 'a', time: '2026-03-02T09:30:00Z', title: blank, body: 'first' },
    { id: 'b', time: '2026-03-02T10:45:00Z', title: blank, body: 'second' },
    { id: 'c', time: '2026-03-01T17:10:00Z', title: blank, body: 'third' },
    { id: 'd', time: '2026-03-01T17:10:00Z', title: 'Has a title', body: 'fourth' },
  ];

  it('is named after the time, so no two buttons share a name', () => {
    render(<Timeline items={items} />);
    const names = [
      /^Details for Mar 2, 2026, 9:30\sAM$/,
      /^Details for Mar 2, 2026, 10:45\sAM$/,
      /^Details for Mar 1, 2026, 5:10\sPM$/,
      /^Details for Has a title$/,
    ];
    // getByRole throws when two buttons match, so finding each name exactly once is the uniqueness proof.
    for (const name of names) expect(screen.getByRole('button', { name })).toBeTruthy();
    const accessibleNames = screen.getAllByRole('button').map((b) => b.textContent);
    expect(new Set(accessibleNames).size).toBe(items.length);
  });

  it('uses the zone of the feed for the time in the name', () => {
    render(<Timeline items={items.slice(0, 1)} timeZone="America/New_York" />);
    expect(screen.getByRole('button', { name: /^Details for Mar 2, 2026, 4:30\sAM\sEST$/ })).toBeTruthy();
  });

  it('uses the date alone for a date-only time, and the raw text for one that does not parse', () => {
    render(
      <Timeline
        items={[
          { id: 'a', time: '2026-03-02', title: blank, body: 'x' },
          { id: 'b', time: 'sometime', title: blank, body: 'y' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Details for Mar 2, 2026' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Details for sometime' })).toBeTruthy();
  });

  it('follows labels.detailsFor', () => {
    render(<Timeline items={items.slice(0, 1)} labels={{ detailsFor: (t) => `Mehr zu ${t}` }} />);
    expect(screen.getByRole('button', { name: /^Mehr zu Mar 2, 2026, 9:30\sAM$/ })).toBeTruthy();
  });
});

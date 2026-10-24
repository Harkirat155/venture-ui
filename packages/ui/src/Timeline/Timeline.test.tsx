import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Timeline, type TimelineItem } from './Timeline.js';

afterEach(cleanup);

// Times are UTC; the dom test project pins TZ=UTC, so the local day of each is its UTC day.
const items: TimelineItem[] = [
  { id: 'a', time: '2026-03-02T09:30:00Z', title: 'Deploy finished', actor: 'Priya', status: 'success' },
  { id: 'b', time: '2026-03-02T08:00:00Z', title: 'Deploy started', body: 'Build 4821 on main' },
  { id: 'c', time: '2026-03-01T23:30:00Z', title: 'Rollback failed', status: 'error', body: 'Timed out' },
];

describe('Timeline structure', () => {
  it('renders an ordered list with one item per event, in the order given', () => {
    render(<Timeline items={items} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    const entries = within(list).getAllByRole('listitem');
    expect(entries.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Deploy finished'),
      expect.stringContaining('Deploy started'),
      expect.stringContaining('Rollback failed'),
    ]);
  });

  it('puts each time in a <time> element with its ISO value', () => {
    const { container } = render(<Timeline items={items} />);
    const times = [...container.querySelectorAll('time')].map((t) => t.getAttribute('datetime'));
    expect(times).toEqual(['2026-03-02T09:30:00.000Z', '2026-03-02T08:00:00.000Z', '2026-03-01T23:30:00.000Z']);
  });

  it('pairs every status with a visible label, and shows none for an item without a status', () => {
    render(<Timeline items={items} />);
    const [done, started, failed] = screen.getAllByRole('listitem');
    expect(within(done as HTMLElement).getByText('Success')).toBeTruthy();
    expect(within(failed as HTMLElement).getByText('Error')).toBeTruthy();
    expect(within(started as HTMLElement).queryByText(/Success|Warning|Error|Info|Neutral/)).toBeNull();
  });

  it('hides the decorative rail from assistive technology', () => {
    const { container } = render(<Timeline items={items} />);
    const rails = container.querySelectorAll('[aria-hidden="true"]');
    expect(rails.length).toBeGreaterThanOrEqual(items.length);
  });

  it('lets labels reword the status text', () => {
    render(<Timeline items={[items[0] as TimelineItem]} labels={{ status: { success: 'Erfolg' } }} />);
    expect(screen.getByText('Erfolg')).toBeTruthy();
    expect(screen.queryByText('Success')).toBeNull();
  });
});

describe('Timeline empty state', () => {
  it('shows a titled empty state and no list when there are no items', () => {
    render(<Timeline items={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No activity yet', level: 3 })).toBeTruthy();
  });

  it('follows headingLevel and labels.empty', () => {
    render(<Timeline items={[]} headingLevel={2} labels={{ empty: 'Nothing here' }} />);
    expect(screen.getByRole('heading', { name: 'Nothing here', level: 2 })).toBeTruthy();
  });
});

describe('Timeline groupBy day', () => {
  it('adds one heading per local day, each labelling its own list', () => {
    render(<Timeline items={items} groupBy="day" />);
    const headings = screen.getAllByRole('heading');
    expect(headings.map((h) => h.textContent)).toEqual(['Monday, March 2, 2026', 'Sunday, March 1, 2026']);
    expect(headings.every((h) => h.tagName === 'H3')).toBe(true);
    const lists = screen.getAllByRole('list', { name: /2026/ });
    expect(lists).toHaveLength(2);
    expect(within(lists[0] as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(within(lists[1] as HTMLElement).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows only the time of day under a day heading, and the date with the time without one', () => {
    const grouped = render(<Timeline items={[items[0] as TimelineItem]} groupBy="day" />);
    expect(grouped.container.querySelector('time')?.textContent).not.toMatch(/Mar/);
    grouped.unmount();
    const flat = render(<Timeline items={[items[0] as TimelineItem]} />);
    expect(flat.container.querySelector('time')?.textContent).toMatch(/Mar/);
  });

  it('groups by the viewer\'s local day, not by UTC', () => {
    const previous = process.env.TZ;
    process.env.TZ = 'Pacific/Auckland'; // UTC+13 in March: 23:30Z on the 1st is already the 2nd
    try {
      render(<Timeline items={items} groupBy="day" />);
      expect(screen.getAllByRole('heading')).toHaveLength(1);
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it('keeps the given order: an out-of-order list repeats a day heading instead of reordering', () => {
    const zigzag: TimelineItem[] = [
      { id: '1', time: '2026-03-02T10:00:00Z', title: 'one' },
      { id: '2', time: '2026-03-01T10:00:00Z', title: 'two' },
      { id: '3', time: '2026-03-02T11:00:00Z', title: 'three' },
    ];
    render(<Timeline items={zigzag} groupBy="day" />);
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Monday, March 2, 2026',
      'Sunday, March 1, 2026',
      'Monday, March 2, 2026',
    ]);
  });

  it('gathers items whose time does not parse under an unknown-date heading', () => {
    render(<Timeline items={[{ id: 'x', time: 'not a date', title: 'Odd one' }]} groupBy="day" />);
    expect(screen.getByRole('heading', { name: 'Unknown date' })).toBeTruthy();
    expect(screen.getByText('Odd one')).toBeTruthy();
  });

  it('numbers the heading level from headingLevel', () => {
    render(<Timeline items={items} groupBy="day" headingLevel={4} />);
    expect(screen.getAllByRole('heading').every((h) => h.tagName === 'H4')).toBe(true);
  });
});

describe('Timeline expand and collapse', () => {
  it('offers a disclosure button only for items that have a body', () => {
    render(<Timeline items={items} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('starts collapsed with aria-expanded=false and a controlled region', () => {
    render(<Timeline items={items} />);
    const button = screen.getByRole('button', { name: /Details for Deploy started/ });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    const controlled = button.getAttribute('aria-controls');
    expect(controlled).toBeTruthy();
    // The region it controls holds the body. Astryx hides it with display:none, which jsdom has no
    // stylesheet for: the browser test (e2e/tests/Timeline.spec.ts) asserts the visibility.
    expect(document.getElementById(controlled as string)?.textContent).toBe('Build 4821 on main');
  });

  it('expands on click and collapses on a second click', async () => {
    const user = userEvent.setup();
    render(<Timeline items={items} />);
    const button = screen.getByRole('button', { name: /Details for Deploy started/ });
    await user.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await user.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('works from the keyboard: Tab to the button, Enter and Space toggle it', async () => {
    const user = userEvent.setup();
    render(<Timeline items={items} />);
    const button = screen.getByRole('button', { name: /Details for Deploy started/ });
    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard(' ');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands items independently', async () => {
    const user = userEvent.setup();
    render(<Timeline items={items} />);
    await user.click(screen.getByRole('button', { name: /Details for Rollback failed/ }));
    expect(screen.getByRole('button', { name: /Details for Rollback failed/ }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: /Details for Deploy started/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('names the button after a title built from elements', () => {
    render(<Timeline items={[{ id: 'r', time: '2026-03-02T09:30:00Z', title: <>Merged <b>#42</b></>, body: 'x' }]} />);
    expect(screen.getByRole('button', { name: 'Details for Merged #42' })).toBeTruthy();
  });

  it('words the visible text and the accessible name from labels.details, or from labels.detailsFor', () => {
    const { unmount } = render(<Timeline items={items} labels={{ details: 'Mehr' }} />);
    expect(screen.getByRole('button', { name: 'Mehr: Deploy started' }).textContent).toContain('Mehr');
    unmount();
    render(<Timeline items={items} labels={{ details: 'Mehr', detailsFor: (title) => `Mehr zu ${title}` }} />);
    expect(screen.getByRole('button', { name: 'Mehr zu Deploy started' })).toBeTruthy();
  });

  it('keeps the English default of every status a partial labels.status leaves out', () => {
    render(<Timeline items={items} labels={{ status: { error: 'Fehler' } }} />);
    expect(screen.getByText('Fehler')).toBeTruthy();
    expect(screen.getByText('Success')).toBeTruthy();
  });
});

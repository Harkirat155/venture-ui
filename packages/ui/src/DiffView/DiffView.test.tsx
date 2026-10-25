import { isInaccessible } from '@testing-library/dom';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffView } from './DiffView.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const numbered = (n: number, edit: number[] = []) =>
  Array.from({ length: n }, (_, i) => (edit.includes(i + 1) ? `line ${i + 1} edited` : `line ${i + 1}`)).join('\n');

/** The text of the cells of every body row, one array per row. */
function bodyRows(container: HTMLElement) {
  return [...container.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent ?? ''),
  );
}

describe('DiffView states', () => {
  it('identical inputs show "No changes" and no table', () => {
    render(<DiffView before={'a\nb\n'} after={'a\nb\n'} />);
    expect(screen.getByRole('status').textContent).toBe('No changes');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('two empty texts are also "No changes"', () => {
    render(<DiffView before="" after="" />);
    expect(screen.getByRole('status').textContent).toBe('No changes');
  });

  it('a pure addition: every line added, summary +N −0', () => {
    const { container } = render(<DiffView before="" after={'a\nb'} mode="unified" />);
    expect(screen.getByText('+2 −0 lines')).toBeTruthy();
    expect(bodyRows(container)).toEqual([
      ['', '1', '+added', 'a'],
      ['', '2', '+added', 'b'],
    ]);
  });

  it('a pure deletion: every line removed, summary +0 −N', () => {
    const { container } = render(<DiffView before={'a\nb\n'} after="" mode="unified" />);
    expect(screen.getByText('+0 −2 lines')).toBeTruthy();
    expect(bodyRows(container)).toEqual([
      ['1', '', '−removed', 'a'],
      ['2', '', '−removed', 'b'],
    ]);
  });

  it('a mix: removed before added, context with both line numbers', () => {
    const { container } = render(<DiffView before={'a\nb\nc\n'} after={'a\nB\nc\nd\n'} mode="unified" />);
    expect(bodyRows(container)).toEqual([
      ['1', '1', 'unchanged', 'a'],
      ['2', '', '−removed', 'b'],
      ['', '2', '+added', 'B'],
      ['3', '3', 'unchanged', 'c'],
      ['', '4', '+added', 'd'],
    ]);
    expect(screen.getByText('+2 −1 lines')).toBeTruthy();
  });

  it('says "1 line" for a single changed line', () => {
    render(<DiffView before="a" after={'a\nb'} mode="unified" />);
    expect(screen.getByText('+1 −0 line')).toBeTruthy();
  });
});

describe('DiffView line endings', () => {
  it('treats CRLF and LF as the same by default', () => {
    render(<DiffView before={'a\r\nb\r\n'} after={'a\nb\n'} />);
    expect(screen.getByRole('status').textContent).toBe('No changes');
  });

  it('with normalizeLineEndings off, shows the lines as changed with a visible ␍', () => {
    const { container } = render(
      <DiffView before={'a\r\nb\r\n'} after={'a\nb\n'} mode="unified" normalizeLineEndings={false} />,
    );
    expect(screen.getByText('+2 −2 lines')).toBeTruthy();
    expect(bodyRows(container).map((r) => r[3])).toEqual(['a␍', 'b␍', 'a', 'b']);
  });
});

describe('DiffView accessibility text', () => {
  it('reads added, removed and unchanged for each line, and the counts for the summary', () => {
    const { container } = render(<DiffView before={'a\nb\n'} after={'a\nc\n'} mode="unified" />);
    const marks = [...container.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[2]?.textContent);
    expect(marks).toEqual(['unchanged', '−removed', '+added']);
    expect(screen.getByText('1 line added, 1 line removed')).toBeTruthy();
    // The symbols are hidden from assistive technology; the sentence is what is read.
    expect(screen.getByText('+1 −1 lines').getAttribute('aria-hidden')).toBe('true');
  });

  it('is a table with column headings', () => {
    render(<DiffView before="a" after="b" mode="unified" />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Old', 'New', 'Change', 'Line']);
  });
});

describe('DiffView collapsed unchanged lines', () => {
  const before = numbered(30);
  const after = numbered(30, [15]);

  it('hides unchanged lines beyond `context` behind a control that says how many', () => {
    const { container } = render(<DiffView before={before} after={after} mode="unified" />);
    expect(screen.getByRole('button', { name: 'Show 11 unchanged lines' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show 12 unchanged lines' })).toBeTruthy();
    // 3 context + removed + added + 3 context, plus the two control rows.
    expect(container.querySelectorAll('tbody tr')).toHaveLength(8 + 2);
  });

  it('opens a run in place, relabels the control, and keeps the control for keyboard focus', async () => {
    const user = userEvent.setup();
    const { container } = render(<DiffView before={before} after={after} mode="unified" />);
    const show = screen.getByRole('button', { name: 'Show 11 unchanged lines' });
    expect(show.getAttribute('aria-expanded')).toBe('false');
    await user.click(show);
    const hide = screen.getByRole('button', { name: 'Hide 11 unchanged lines' });
    expect(hide).toBe(show);
    expect(hide.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(8 + 2 + 11);
    await user.click(hide);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(8 + 2);
  });

  it('works from the keyboard', async () => {
    const user = userEvent.setup();
    render(<DiffView before={before} after={after} mode="unified" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show 11 unchanged lines' }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Hide 11 unchanged lines' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('collapses nothing when context covers the file', () => {
    render(<DiffView before={before} after={after} mode="unified" context={100} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('starts collapsed again when the input changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DiffView before={before} after={after} mode="unified" />);
    await user.click(screen.getByRole('button', { name: 'Show 11 unchanged lines' }));
    rerender(<DiffView before={before} after={numbered(30, [16])} mode="unified" />);
    expect(screen.getAllByRole('button').every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });
});

describe('DiffView modes', () => {
  const before = 'keep\nold one\nold two\nkeep too\n';
  const after = 'keep\nnew one\nkeep too\n';

  it('split: before and after side by side, the nth removed line level with the nth added', () => {
    const { container } = render(<DiffView before={before} after={after} mode="split" />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Old',
      'Before',
      'New',
      'After',
    ]);
    expect(bodyRows(container)).toEqual([
      ['1', 'unchangedkeep', '1', 'unchangedkeep'],
      ['2', '−removedold one', '2', '+addednew one'],
      ['3', '−removedold two', '', ''],
      ['4', 'unchangedkeep too', '3', 'unchangedkeep too'],
    ]);
  });

  it('split: a context line keeps all four cells, and only the text of its right copy is hidden from assistive technology', () => {
    const { container } = render(<DiffView before={before} after={after} mode="split" />);
    const first = container.querySelector('tbody tr') as HTMLElement;
    const cells = [...first.querySelectorAll('td')];
    expect(cells.map((c) => c.getAttribute('aria-hidden'))).toEqual([null, null, null, null]);
    expect(isInaccessible(within(cells[3] as HTMLElement).getByText('keep'))).toBe(true);
    expect(isInaccessible(within(cells[1] as HTMLElement).getByText('keep'))).toBe(false);
  });

  it('auto: unified below 48rem, split from 48rem up, following the viewport', () => {
    const listeners = new Set<() => void>();
    let wide = false;
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query === '(min-width: 48rem)' && wide;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }));
    render(<DiffView before={before} after={after} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Old', 'New', 'Change', 'Line']);
    // What a resize across the breakpoint does: the query now matches and its change event fires.
    wide = true;
    act(() => listeners.forEach((fn) => fn()));
    expect(screen.getAllByRole('columnheader')[1]?.textContent).toBe('Before');
  });

  it('auto without matchMedia (a server, jsdom) is unified', () => {
    render(<DiffView before={before} after={after} />);
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Old');
  });

  it('an explicit mode ignores the viewport', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    render(<DiffView before={before} after={after} mode="unified" />);
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Old');
  });
});

describe('DiffView split view for assistive technology', () => {
  /** The body rows that carry a line (not the rows holding a "Show unchanged lines" button). */
  const lineRows = (container: HTMLElement) =>
    [...container.querySelectorAll('tbody tr')].filter((tr) => !tr.querySelector('button')) as HTMLElement[];

  it('exposes the same four cells in every row, context rows included', () => {
    const { container } = render(<DiffView before={'keep\nold\nkeep too\n'} after={'keep\nnew\nextra\nkeep too\n'} mode="split" />);
    const rows = lineRows(container);
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(within(row).getAllByRole('cell')).toHaveLength(4);
    // None of the cells is hidden, so none can be dropped from the table a screen reader walks.
    expect(container.querySelectorAll('td[aria-hidden]')).toHaveLength(0);
  });

  it('keeps the new line number of a shifted context line reachable', () => {
    // "a" is line 1 before and line 2 after: the number that differs must not be hidden with the duplicate text.
    const { container } = render(<DiffView before={'a\nb'} after={'x\na\nb'} mode="split" />);
    const contextRow = lineRows(container).find((row) => within(row).queryAllByText('a').length > 0);
    const cells = within(contextRow as HTMLElement).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', 'unchangeda', '2', 'unchangeda']);
    expect(isInaccessible(cells[2] as HTMLElement)).toBe(false);
    // The right-hand cell stays in the table, its duplicated text does not.
    expect(isInaccessible(cells[3] as HTMLElement)).toBe(false);
    expect(isInaccessible(within(cells[3] as HTMLElement).getByText('a'))).toBe(true);
    expect(isInaccessible(within(cells[1] as HTMLElement).getByText('a'))).toBe(false);
  });

  it('reads the text of a context line once, not on both sides', () => {
    render(<DiffView before={'a\nb'} after={'x\na\nb'} mode="split" />);
    expect(screen.getAllByText('a').filter((el) => !isInaccessible(el))).toHaveLength(1);
    expect(screen.getAllByText('unchanged').filter((el) => !isInaccessible(el))).toHaveLength(2); // a and b, once each
  });

  it('reads a changed line on its own side only', () => {
    const { container } = render(<DiffView before={'old'} after={'new'} mode="split" />);
    const [row] = lineRows(container);
    const cells = within(row as HTMLElement).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', '\u2212removedold', '1', '+addednew']);
  });

  it('exposes the same cells in the unified view too', () => {
    const { container } = render(<DiffView before={'a\nb'} after={'x\na\nb'} mode="unified" />);
    for (const row of lineRows(container)) expect(within(row).getAllByRole('cell')).toHaveLength(4);
  });
});

describe('DiffView language', () => {
  const md = '# Title\n\n```sh\nls\n```\n';
  const edited = '# Title\n\n```sh\nls -l\n```\n';

  it('markdown marks headings and fences for emphasis; text does not', () => {
    const { container, unmount } = render(
      <DiffView before={md} after={edited} mode="unified" context={9} language="markdown" />,
    );
    const emphasis = (text: string) =>
      [...container.querySelectorAll('tbody tr td:last-child [data-type="code"]')]
        .find((e) => e.textContent === text)
        ?.getAttribute('data-emphasis') ?? null;
    expect(emphasis('# Title')).toBe('heading');
    expect(emphasis('```sh')).toBe('fence');
    expect(emphasis('ls')).toBeNull();
    unmount();
    const plain = render(<DiffView before={md} after={edited} mode="unified" context={9} />);
    expect(plain.container.querySelector('[data-emphasis]')).toBeNull();
  });
});

describe('DiffView labels', () => {
  it('rewords the summary, the control and the line words, and keeps defaults for the rest', async () => {
    const user = userEvent.setup();
    render(
      <DiffView
        before={numbered(30)}
        after={numbered(30, [15])}
        mode="unified"
        labels={{
          summary: (a, r) => `${a} neu, ${r} weg`,
          showUnchanged: (n) => `${n} unveränderte Zeilen zeigen`,
          removed: 'entfernt',
        }}
      />,
    );
    expect(screen.getByText('1 neu, 1 weg')).toBeTruthy();
    expect(screen.getByText('entfernt')).toBeTruthy();
    expect(screen.getByText('1 line added, 1 line removed')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '11 unveränderte Zeilen zeigen' }));
    expect(screen.getByRole('button', { name: 'Hide 11 unchanged lines' })).toBeTruthy();
  });

  it('rewords "No changes"', () => {
    render(<DiffView before="a" after="a" labels={{ noChanges: 'Keine Änderungen' }} />);
    expect(screen.getByRole('status').textContent).toBe('Keine Änderungen');
  });
});

describe('DiffView large input', () => {
  it('renders a 2,000-line diff, with most of it collapsed, well inside the budget', () => {
    const start = performance.now();
    const { container } = render(
      <DiffView before={numbered(2000)} after={numbered(2000, [100, 1000, 1900])} mode="unified" />,
    );
    const ms = performance.now() - start;
    expect(screen.getByText('+3 −3 lines')).toBeTruthy();
    // Three changes with 3 lines of context each side and four control rows, instead of 2,003 rows.
    expect(container.querySelectorAll('tbody tr').length).toBeLessThan(40);
    expect(ms).toBeLessThan(1500);
  });

  it('with every collapsed run opened, all 2,000 lines render within budget', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DiffView before={numbered(2000)} after={numbered(2000, [100, 1000, 1900])} mode="unified" />,
    );
    const start = performance.now();
    for (const button of screen.getAllByRole('button')) await user.click(button);
    const ms = performance.now() - start;
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2000 + 3 + 4);
    expect(ms).toBeLessThan(8000);
  });

  it('a worst case where every one of 2,000 lines changed renders within budget', () => {
    const before = Array.from({ length: 2000 }, (_, i) => `old ${i}`).join('\n');
    const after = Array.from({ length: 2000 }, (_, i) => `new ${i}`).join('\n');
    const start = performance.now();
    const { container } = render(<DiffView before={before} after={after} mode="split" />);
    const ms = performance.now() - start;
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2000);
    expect(within(container).getByText('+2000 −2000 lines')).toBeTruthy();
    expect(ms).toBeLessThan(5000);
  });
});

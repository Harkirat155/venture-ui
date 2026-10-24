import { describe, expect, it } from 'vitest';
import { buildRows, segmentRows, splitRows, summarize, type DiffRow } from './diffModel.js';

const lines = (n: number, edit: number[] = []) =>
  Array.from({ length: n }, (_, i) => (edit.includes(i + 1) ? `line ${i + 1} edited` : `line ${i + 1}`)).join('\n');

describe('buildRows', () => {
  it('has no rows for two empty texts and none changed for identical ones', () => {
    expect(buildRows('', '')).toEqual([]);
    expect(summarize(buildRows('a\nb\n', 'a\nb\n'))).toEqual({ added: 0, removed: 0 });
  });

  it('a pure addition is added rows numbered on the new side only', () => {
    expect(buildRows('', 'a\nb')).toEqual([
      { kind: 'added', text: 'a', newLine: 1 },
      { kind: 'added', text: 'b', newLine: 2 },
    ]);
  });

  it('a pure deletion is removed rows numbered on the old side only', () => {
    expect(buildRows('a\nb\n', '')).toEqual([
      { kind: 'removed', text: 'a', oldLine: 1 },
      { kind: 'removed', text: 'b', oldLine: 2 },
    ]);
  });

  it('puts removed lines before the added lines that replace them, with both line numbers on context', () => {
    expect(buildRows('a\nb\nc\n', 'a\nB\nc\nd\n')).toEqual([
      { kind: 'context', text: 'a', oldLine: 1, newLine: 1 },
      { kind: 'removed', text: 'b', oldLine: 2 },
      { kind: 'added', text: 'B', newLine: 2 },
      { kind: 'context', text: 'c', oldLine: 3, newLine: 3 },
      { kind: 'added', text: 'd', newLine: 4 },
    ]);
  });

  it('keeps empty lines as lines', () => {
    expect(buildRows('a\n\nb\n', 'a\n\nb\n').map((r) => r.text)).toEqual(['a', '', 'b']);
    expect(summarize(buildRows('a\n\nb', 'a\nb'))).toEqual({ added: 0, removed: 1 });
  });

  it('never counts a final line break as a change', () => {
    expect(summarize(buildRows('a\nb', 'a\nb\n'))).toEqual({ added: 0, removed: 0 });
    expect(summarize(buildRows('a\nb\n', 'a\nb'))).toEqual({ added: 0, removed: 0 });
  });

  it('treats CRLF and LF as the same line ending by default', () => {
    expect(summarize(buildRows('a\r\nb\r\nc\r\n', 'a\nb\nc\n'))).toEqual({ added: 0, removed: 0 });
    expect(buildRows('a\r\nb\r\n', 'a\nB\n').map((r) => r.text)).toEqual(['a', 'b', 'B']);
  });

  it('with normalisation off, a CR-only difference is a change and the CR stays in the text', () => {
    const rows = buildRows('a\r\nb\r\n', 'a\nb\n', false);
    expect(summarize(rows)).toEqual({ added: 2, removed: 2 });
    expect(rows.find((r) => r.kind === 'removed')?.text).toBe('a\r');
  });

  it('computes a 2,000-line diff in a fraction of a second', () => {
    const before = lines(2000);
    const after = lines(2000, [10, 500, 999, 1500, 1990]);
    const start = performance.now();
    const rows = buildRows(before, after);
    const ms = performance.now() - start;
    expect(summarize(rows)).toEqual({ added: 5, removed: 5 });
    expect(rows).toHaveLength(2005);
    expect(ms).toBeLessThan(1000);
  });
});

describe('segmentRows', () => {
  const rows = buildRows(lines(30), lines(30, [15]));

  it('keeps `context` unchanged lines either side of a change and collapses the rest', () => {
    const segments = segmentRows(rows, 3);
    expect(segments.map((s) => [s.type, s.rows.length])).toEqual([
      ['collapsed', 11],
      ['rows', 3 + 2 + 3],
      ['collapsed', 12],
    ]);
  });

  it('shows everything when context reaches the ends, and nothing but changes with context 0', () => {
    expect(segmentRows(rows, 100).map((s) => s.type)).toEqual(['rows']);
    const zero = segmentRows(rows, 0);
    expect(zero.map((s) => s.type)).toEqual(['collapsed', 'rows', 'collapsed']);
    expect(zero[1]?.rows.map((r) => r.kind)).toEqual(['removed', 'added']);
  });

  it('shows a single leftover unchanged line instead of hiding it behind a control', () => {
    // Changes at lines 1 and 6 with context 2: line 4 is the one unchanged line outside both windows.
    const r = buildRows(lines(8), lines(8, [1, 6]));
    const segments = segmentRows(r, 2);
    expect(segments.map((s) => s.type)).toEqual(['rows']);
  });

  it('gives each collapsed run an id that is its first row index', () => {
    const [first, , last] = segmentRows(rows, 3);
    expect(first).toMatchObject({ type: 'collapsed', id: 0 });
    expect(last).toMatchObject({ type: 'collapsed', id: 19 });
  });

  it('treats NaN as no context and Infinity as all of it', () => {
    expect(segmentRows(rows, Number.NaN)).toEqual(segmentRows(rows, 0));
    expect(segmentRows(rows, Infinity).map((s) => s.type)).toEqual(['rows']);
  });

  it('floors and clamps a fractional or negative context', () => {
    expect(segmentRows(rows, -4)).toEqual(segmentRows(rows, 0));
    expect(segmentRows(rows, 2.9)).toEqual(segmentRows(rows, 2));
  });
});

describe('splitRows', () => {
  const row = (kind: DiffRow['kind'], text: string): DiffRow => ({ kind, text });

  it('puts a context line on both sides', () => {
    const c = row('context', 'x');
    expect(splitRows([c])).toEqual([{ left: c, right: c, isContext: true }]);
  });

  it('pairs removed and added lines of a block first to first, the longer side overhanging', () => {
    const [r1, r2, a1] = [row('removed', 'r1'), row('removed', 'r2'), row('added', 'a1')];
    expect(splitRows([r1, r2, a1])).toEqual([
      { left: r1, right: a1 },
      { left: r2, right: undefined },
    ]);
    const [r, b1, b2] = [row('removed', 'r'), row('added', 'b1'), row('added', 'b2')];
    expect(splitRows([r, b1, b2])).toEqual([
      { left: r, right: b1 },
      { left: undefined, right: b2 },
    ]);
  });

  it('does not pair across a context line', () => {
    const [r, c, a] = [row('removed', 'r'), row('context', 'c'), row('added', 'a')];
    expect(splitRows([r, c, a])).toEqual([
      { left: r, right: undefined },
      { left: c, right: c, isContext: true },
      { left: undefined, right: a },
    ]);
  });
});

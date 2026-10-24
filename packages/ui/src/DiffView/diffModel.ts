import { diffLines } from 'diff';

export type DiffRowKind = 'context' | 'added' | 'removed';

export type DiffRow = {
  kind: DiffRowKind;
  /** The line without its line break. With `normalizeLineEndings` off, a CR left at the end is kept. */
  text: string;
  /** 1-based line number in `before`; absent for an added line. */
  oldLine?: number;
  /** 1-based line number in `after`; absent for a removed line. */
  newLine?: number;
};

export type DiffSummary = { added: number; removed: number };

/**
 * Line-level diff of two texts, as one row per line in display order: removed lines come before the added lines that
 * replace them. The algorithm is jsdiff's `diffLines`. A final line break is never a change, and with
 * `normalizeLineEndings` (the default) CRLF and LF are the same.
 */
export function buildRows(before: string, after: string, normalizeLineEndings = true): DiffRow[] {
  const changes = diffLines(before, after, { stripTrailingCr: normalizeLineEndings, ignoreNewlineAtEof: true });
  const rows: DiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;
  for (const change of changes) {
    for (const text of linesOf(change.value)) {
      if (change.added) rows.push({ kind: 'added', text, newLine: newLine++ });
      else if (change.removed) rows.push({ kind: 'removed', text, oldLine: oldLine++ });
      else rows.push({ kind: 'context', text, oldLine: oldLine++, newLine: newLine++ });
    }
  }
  return rows;
}

/** `a\nb\n` is two lines, `a\n\n` is two (the second empty), and `` is none. */
function linesOf(value: string): string[] {
  if (value === '') return [];
  const lines = value.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

export function summarize(rows: readonly DiffRow[]): DiffSummary {
  let added = 0;
  let removed = 0;
  for (const row of rows) {
    if (row.kind === 'added') added++;
    else if (row.kind === 'removed') removed++;
  }
  return { added, removed };
}

/** Unchanged lines far from any change, which the view hides behind one control. */
export type CollapsedRun = { type: 'collapsed'; id: number; rows: DiffRow[] };
export type ShownRows = { type: 'rows'; rows: DiffRow[] };
export type Segment = ShownRows | CollapsedRun;

/**
 * Keeps `context` unchanged lines either side of every change and gathers the rest into collapsed runs. A run of a
 * single line stays visible (a control would take as much room as the line). `id` is the run's first row index, so it
 * stays stable while the rows do.
 */
export function segmentRows(rows: readonly DiffRow[], context: number): Segment[] {
  const near = Number.isNaN(context) ? 0 : Math.max(0, Math.floor(context));
  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((row, i) => {
    if (row.kind === 'context') return;
    for (let j = Math.max(0, i - near); j <= Math.min(rows.length - 1, i + near); j++) keep[j] = true;
  });

  const segments: Segment[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    if (keep[i]) {
      while (j < rows.length && keep[j]) j++;
      segments.push({ type: 'rows', rows: rows.slice(i, j) });
    } else {
      while (j < rows.length && !keep[j]) j++;
      const run = rows.slice(i, j);
      if (run.length > 1) segments.push({ type: 'collapsed', id: i, rows: run });
      else segments.push({ type: 'rows', rows: run });
    }
    i = j;
  }
  return mergeShown(segments);
}

/** A single-line run kept visible sits between two shown segments: join them so split pairing sees one block. */
function mergeShown(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of segments) {
    const last = merged.at(-1);
    if (segment.type === 'rows' && last?.type === 'rows') last.rows = [...last.rows, ...segment.rows];
    else merged.push(segment.type === 'rows' ? { type: 'rows', rows: [...segment.rows] } : segment);
  }
  return merged;
}

/** One row of the split view: a context line sits on both sides, a change pairs a removed line with an added one. */
export type SplitRow = { left?: DiffRow; right?: DiffRow };

/**
 * Pairs the removed and added lines of each change block, first with first. jsdiff puts a block's removed lines
 * before its added lines, so the nth removed line sits level with the nth added line, and the longer side overhangs.
 */
export function splitRows(rows: readonly DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let removed: DiffRow[] = [];
  let added: DiffRow[] = [];
  const flush = () => {
    for (let k = 0; k < Math.max(removed.length, added.length); k++) out.push({ left: removed[k], right: added[k] });
    removed = [];
    added = [];
  };
  for (const row of rows) {
    if (row.kind === 'removed') {
      if (added.length > 0) flush();
      removed.push(row);
    } else if (row.kind === 'added') added.push(row);
    else {
      flush();
      out.push({ left: row, right: row });
    }
  }
  flush();
  return out;
}

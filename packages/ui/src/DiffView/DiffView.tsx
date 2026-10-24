import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { VStack } from '@astryxdesign/core/VStack';
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {
  buildRows,
  segmentRows,
  splitRows,
  summarize,
  type DiffRow,
  type Segment,
  type SplitRow,
} from './diffModel.js';

export type DiffViewProps = {
  /** The text before the change. */
  before: string;
  /** The text after the change. */
  after: string;
  /** `split` puts before and after side by side, `unified` stacks them, `auto` is split from 48rem of viewport width up. */
  mode?: 'unified' | 'split' | 'auto';
  /** `markdown` sets headings in bold and dims code fences; every line is still compared and shown as text. */
  language?: 'text' | 'markdown';
  /** Unchanged lines kept around each change. The rest hide behind a "show unchanged lines" control. */
  context?: number;
  /** Treat CRLF and LF as the same line ending. Off, a line that differs only by a CR is a change, shown with `␍`. */
  normalizeLineEndings?: boolean;
  /** Overrides for the built-in English text. */
  labels?: Partial<DiffViewLabels>;
};

/** The words DiffView writes itself. Pass `labels` to translate or reword them. */
export type DiffViewLabels = {
  /** Shown instead of the table when the two texts are the same. */
  noChanges: string;
  /** The visible summary, e.g. "+3 −2 lines". */
  summary: (added: number, removed: number) => string;
  /** The same summary for a screen reader, e.g. "3 lines added, 2 lines removed". */
  summarySpoken: (added: number, removed: number) => string;
  /** The control that reveals a collapsed run of unchanged lines. */
  showUnchanged: (count: number) => string;
  /** The same control once the run is open. */
  hideUnchanged: (count: number) => string;
  /** Read by screen readers in front of a line, beside the visible + or −. */
  added: string;
  removed: string;
  unchanged: string;
  /** Headings of the before side and the after side of the split view. */
  before: string;
  after: string;
  /**
   * Headings of the old and the new line-number columns (visible in the unified view, hidden in the split view). They
   * sit over a narrow column, so keep them to a word of about three letters.
   */
  beforeLine: string;
  afterLine: string;
  /** Hidden headings of the marker and text columns of the unified view. */
  change: string;
  line: string;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const DEFAULT_LABELS: DiffViewLabels = {
  noChanges: 'No changes',
  summary: (added, removed) => `+${added} −${removed} ${added + removed === 1 ? 'line' : 'lines'}`,
  summarySpoken: (added, removed) =>
    `${plural(added, 'line', 'lines')} added, ${plural(removed, 'line', 'lines')} removed`,
  showUnchanged: (count) => `Show ${plural(count, 'unchanged line', 'unchanged lines')}`,
  hideUnchanged: (count) => `Hide ${plural(count, 'unchanged line', 'unchanged lines')}`,
  added: 'added',
  removed: 'removed',
  unchanged: 'unchanged',
  before: 'Before',
  after: 'After',
  beforeLine: 'Old',
  afterLine: 'New',
  change: 'Change',
  line: 'Line',
};

const WIDE = '(min-width: 48rem)';
// Read synchronously on the client, so a wide screen never shows a frame of the unified view first. No matchMedia
// (a server, jsdom) means narrow.
const hasMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const subscribeWide = (onChange: () => void) => {
  if (!hasMedia()) return () => {};
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isWide = () => hasMedia() && window.matchMedia(WIDE).matches;
const neverWide = () => false;

const MARK = { added: '+', removed: '−', context: '' } as const;
const WASH: Record<DiffRow['kind'], string | undefined> = {
  added: 'var(--color-background-green)',
  removed: 'var(--color-background-red)',
  context: undefined,
};
const INK: Record<DiffRow['kind'], string | undefined> = {
  added: 'var(--color-text-green)',
  removed: 'var(--color-text-red)',
  context: undefined,
};

// Fixed widths in character cells (the code font's), plus the cell padding. A percentage width lets Astryx's cell
// clip a two-digit number down to one.
const cellPadding = '2 * var(--spacing-2)';
const columnWidth = (ch: number): CSSProperties => ({
  width: `calc(${ch}ch + ${cellPadding})`,
  minWidth: `calc(${ch}ch + ${cellPadding})`,
  whiteSpace: 'nowrap',
});
const markCell: CSSProperties = { ...columnWidth(1), textAlign: 'center' };
/** The style of a line-number cell, which depends on how many digits the longest line number has. */
const NumberCellStyle = createContext<CSSProperties>({});
// Long lines wrap, and a line of one unbroken token must not widen the page.
const wrapped: CSSProperties = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };

/**
 * A line-level diff of two texts, unified or side by side, with the unchanged lines far from any change collapsed
 * behind a control. The comparison is jsdiff's `diffLines`; a final line break is never a change.
 */
export function DiffView({
  before,
  after,
  mode = 'auto',
  language = 'text',
  context = 3,
  normalizeLineEndings = true,
  labels,
}: DiffViewProps) {
  const text = useMemo<DiffViewLabels>(() => ({ ...DEFAULT_LABELS, ...labels }), [labels]);
  const wide = useSyncExternalStore(subscribeWide, isWide, neverWide);
  const rows = useMemo(() => buildRows(before, after, normalizeLineEndings), [before, after, normalizeLineEndings]);
  const segments = useMemo(() => segmentRows(rows, context), [rows, context]);
  const { added, removed } = useMemo(() => summarize(rows), [rows]);
  // Which collapsed runs are open. Tied to this `rows` value, so new input starts everything collapsed.
  const [open, setOpen] = useState<{ rows: readonly DiffRow[]; ids: ReadonlySet<number> }>({
    rows,
    ids: new Set(),
  });
  const openIds = open.rows === rows ? open.ids : new Set<number>();
  const toggle = (id: number) =>
    setOpen((current) => {
      const ids = new Set(current.rows === rows ? current.ids : []);
      if (!ids.delete(id)) ids.add(id);
      return { rows, ids };
    });

  if (added + removed === 0) {
    return (
      <Text type="supporting" role="status">
        {text.noChanges}
      </Text>
    );
  }

  const split = mode === 'split' || (mode === 'auto' && wide);
  // Wide enough for the longest line number, and for the heading "Old" or "New" (a heading is in the body font,
  // which is wider than the code font).
  const digits = Math.max(4, String(rows.reduce((m, r) => Math.max(m, r.oldLine ?? 0, r.newLine ?? 0), 0)).length);
  const numberCell: CSSProperties = { ...columnWidth(digits), textAlign: 'end' };
  return (
    <VStack gap={2}>
      <HStack gap={1}>
        <Text type="code" aria-hidden="true">
          {text.summary(added, removed)}
        </Text>
        <VisuallyHidden>{text.summarySpoken(added, removed)}</VisuallyHidden>
      </HStack>
      <NumberCellStyle value={numberCell}>
        <Table density="compact" dividers="none" verticalAlign="top" data-diff-mode={split ? 'split' : 'unified'}>
          <TableHeader>
            <TableRow>
              {split ? (
                <>
                  <TableHeaderCell style={numberCell}>
                    <VisuallyHidden>{text.beforeLine}</VisuallyHidden>
                  </TableHeaderCell>
                  <TableHeaderCell>{text.before}</TableHeaderCell>
                  <TableHeaderCell style={numberCell}>
                    <VisuallyHidden>{text.afterLine}</VisuallyHidden>
                  </TableHeaderCell>
                  <TableHeaderCell>{text.after}</TableHeaderCell>
                </>
              ) : (
                <>
                  <TableHeaderCell style={numberCell}>{text.beforeLine}</TableHeaderCell>
                  <TableHeaderCell style={numberCell}>{text.afterLine}</TableHeaderCell>
                  <TableHeaderCell style={markCell}>
                    <VisuallyHidden>{text.change}</VisuallyHidden>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <VisuallyHidden>{text.line}</VisuallyHidden>
                  </TableHeaderCell>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <SegmentRows
                key={segment.type === 'collapsed' ? `c${segment.id}` : `r${segment.rows[0]?.oldLine ?? ''}:${segment.rows[0]?.newLine ?? ''}`}
                segment={segment}
                isOpen={segment.type === 'collapsed' && openIds.has(segment.id)}
                onToggle={toggle}
                split={split}
                language={language}
                labels={text}
              />
            ))}
          </TableBody>
        </Table>
      </NumberCellStyle>
    </VStack>
  );
}

function SegmentRows({
  segment,
  isOpen,
  onToggle,
  split,
  language,
  labels,
}: {
  segment: Segment;
  isOpen: boolean;
  onToggle: (id: number) => void;
  split: boolean;
  language: 'text' | 'markdown';
  labels: DiffViewLabels;
}) {
  const body = (rows: readonly DiffRow[]) =>
    split ? (
      <>
        {splitRows(rows).map((row, i) => (
          <SplitLine key={i} row={row} language={language} labels={labels} />
        ))}
      </>
    ) : (
      <>
        {rows.map((row, i) => (
          <UnifiedLine key={i} row={row} language={language} labels={labels} />
        ))}
      </>
    );

  if (segment.type === 'rows') return body(segment.rows);

  const count = segment.rows.length;
  return (
    <>
      <TableRow>
        <TableCell colSpan={4}>
          <Button
            variant="ghost"
            size="sm"
            label={isOpen ? labels.hideUnchanged(count) : labels.showUnchanged(count)}
            aria-expanded={isOpen}
            onClick={() => onToggle(segment.id)}
          />
        </TableCell>
      </TableRow>
      {isOpen ? body(segment.rows) : null}
    </>
  );
}

/** What a line looks like: markdown headings in bold, code fences dimmed. */
function lineStyle(text: string, language: 'text' | 'markdown') {
  if (language !== 'markdown') return {};
  if (/^ {0,3}#{1,6}(\s|$)/.test(text)) return { weight: 'semibold' as const, 'data-emphasis': 'heading' };
  if (/^ {0,3}(`{3,}|~{3,})/.test(text)) return { color: 'secondary' as const, 'data-emphasis': 'fence' };
  return {};
}

/** A line's text. A CR kept at the end (line endings not normalised) is drawn as a symbol, so a change that only the CR makes can be seen. */
function LineText({ row, language }: { row: DiffRow; language: 'text' | 'markdown' }) {
  const shown = row.text.endsWith('\r') ? `${row.text.slice(0, -1)}␍` : row.text;
  return (
    <Text as="div" type="code" style={wrapped} {...lineStyle(row.text, language)}>
      {shown === '' ? ' ' : shown}
    </Text>
  );
}

function LineNumber({ value }: { value: number | undefined }) {
  return (
    <Text type="code" color="secondary" hasTabularNumbers>
      {value ?? ''}
    </Text>
  );
}

function Mark({ kind, labels }: { kind: DiffRow['kind']; labels: DiffViewLabels }) {
  return (
    <>
      <Text type="code" aria-hidden="true" style={{ color: INK[kind] }}>
        {MARK[kind]}
      </Text>
      <VisuallyHidden>{labels[kind === 'context' ? 'unchanged' : kind]}</VisuallyHidden>
    </>
  );
}

function UnifiedLine({ row, language, labels }: { row: DiffRow; language: 'text' | 'markdown'; labels: DiffViewLabels }) {
  const numberCell = useContext(NumberCellStyle);
  const style = { background: WASH[row.kind] };
  return (
    <TableRow>
      <TableCell style={{ ...numberCell, ...style }}>
        <LineNumber value={row.oldLine} />
      </TableCell>
      <TableCell style={{ ...numberCell, ...style }}>
        <LineNumber value={row.newLine} />
      </TableCell>
      <TableCell style={{ ...markCell, ...style }}>
        <Mark kind={row.kind} labels={labels} />
      </TableCell>
      <TableCell style={style}>
        <LineText row={row} language={language} />
      </TableCell>
    </TableRow>
  );
}

function SplitLine({ row, language, labels }: { row: SplitRow; language: 'text' | 'markdown'; labels: DiffViewLabels }) {
  // A context line is on both sides; the right copy is hidden from assistive technology so it is read once.
  const isContext = row.isContext === true;
  return (
    <TableRow>
      <SplitSide row={row.left} number="oldLine" language={language} labels={labels} />
      <SplitSide row={row.right} number="newLine" language={language} labels={labels} isDuplicate={isContext} />
    </TableRow>
  );
}

function SplitSide({
  row,
  number,
  language,
  labels,
  isDuplicate = false,
}: {
  row: DiffRow | undefined;
  number: 'oldLine' | 'newLine';
  language: 'text' | 'markdown';
  labels: DiffViewLabels;
  isDuplicate?: boolean;
}) {
  const numberCell = useContext(NumberCellStyle);
  const style = { background: row ? WASH[row.kind] : undefined };
  return (
    <>
      <TableCell style={{ ...numberCell, ...style }} aria-hidden={isDuplicate || undefined}>
        <LineNumber value={row?.[number]} />
      </TableCell>
      <TableCell style={{ width: '50%', ...style }} aria-hidden={isDuplicate || undefined}>
        {row ? (
          <HStack gap={1} align="start">
            <Mark kind={row.kind} labels={labels} />
            <LineText row={row} language={language} />
          </HStack>
        ) : null}
      </TableCell>
    </>
  );
}

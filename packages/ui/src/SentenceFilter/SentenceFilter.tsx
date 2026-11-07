import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export type SentenceFilterOption = {
  /** The value passed to `onChange` when this option is chosen. */
  value: string;
  /** What the option reads as, in the list and, once chosen, in the sentence. */
  label: string;
  /** How many results the option leads to. Shown beside the label, formatted by `formatCount`. */
  count?: number;
  /** An option that cannot be chosen now. It stays visible and keyboard navigation skips it. */
  disabled?: boolean;
};

/** A changeable word. It reads as `label` in the sentence and opens `options` when pressed. */
export type SentenceFilterWord = {
  type: 'word';
  id: string;
  /** The dimension, for screen readers: "Genre". The word's accessible name is `name: label`. */
  name: string;
  /** The word as the sentence reads it now: "any genre". */
  label: string;
  /** The `value` of the current option. */
  value: string;
  options: SentenceFilterOption[];
};

/** A fixed phrase that can be taken out of the sentence: "with Ada" and a remove button. */
export type SentenceFilterToken = {
  type: 'token';
  id: string;
  label: string;
  /** The remove button's accessible name: "Remove author filter: Ada". */
  removeLabel: string;
};

/** A string is plain text and carries its own spaces. */
export type SentencePart = string | SentenceFilterWord | SentenceFilterToken;

export type SentenceFilterProps = {
  /** The sentence, in reading order. The component holds no filter state: change `parts` in `onChange`. */
  parts: SentencePart[];
  /** An option was chosen in the word `id`. */
  onChange(id: string, value: string): void;
  /** The remove button of token `id` was pressed. Without it, tokens show no remove button. */
  onRemove?(id: string): void;
  /** The element the sentence is. A heading takes the theme's size for that level; `p` takes its size from the parent. */
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** Formats `count`. Defaults to `toLocaleString`. */
  formatCount?(n: number): string;
};

const CONTROL = 'data-sentence-filter-control';

// A control inside running text. Its hit area grows to 44 px (--spacing-11) with padding that a negative margin
// takes back, so the line spacing of the sentence does not change. `1lh` is the line height the control inherits.
const GROW = 'max(0px, calc((var(--spacing-11) - 1lh) / 2))';
const controlStyle: CSSProperties = {
  display: 'inline-block',
  maxInlineSize: '100%',
  textAlign: 'start',
  paddingBlock: GROW,
  marginBlock: `calc(-1 * ${GROW})`,
  paddingInline: 'var(--spacing-1)',
  marginInline: 'calc(-1 * var(--spacing-1))',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: 'var(--spacing-1)',
};

// The remove button sits a little off its label; the gap is padding, so the hit area covers it.
const removeStyle: CSSProperties = {
  ...controlStyle,
  paddingInline: 'var(--spacing-2)',
  marginInline: '0 calc(-1 * var(--spacing-2))',
};

// The popup is no wider than the viewport minus a gutter on each side.
const POPUP_WIDTH = 'min(22rem, calc(100vw - var(--spacing-8)))';

// A radio group chooses as the arrow keys move, which here would change the sentence and close the popup on the
// first arrow press. So arrows only move through the options, and a click, Space or Enter chooses.
const MOVES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

function Options({
  word,
  value,
  formatCount,
  choose,
}: {
  word: SentenceFilterWord;
  value: string;
  formatCount: (n: number) => string;
  choose: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const moving = useRef(false);
  return (
    <VStack
      onKeyDownCapture={(event) => {
        moving.current = MOVES.has(event.key);
        if (event.key === 'Enter') choose(draft);
      }}
      onKeyUp={() => {
        moving.current = false;
      }}
    >
      <RadioList
        label={word.name}
        isLabelHidden
        value={draft}
        width={POPUP_WIDTH}
        onChange={(next) => {
          setDraft(next);
          if (!moving.current) choose(next);
        }}
      >
        {word.options.map((option) => (
          <RadioListItem
            key={option.value}
            value={option.value}
            label={option.label}
            isDisabled={option.disabled}
            endContent={
              option.count == null ? undefined : (
                <Text type="supporting" hasTabularNumbers>
                  {formatCount(option.count)}
                </Text>
              )
            }
          />
        ))}
      </RadioList>
    </VStack>
  );
}

function Word({
  word,
  onChange,
  formatCount,
}: {
  word: SentenceFilterWord;
  onChange: SentenceFilterProps['onChange'];
  formatCount: (n: number) => string;
}) {
  return (
    <ComplexSelector<string>
      label={word.name}
      value={word.value}
      renderTrigger={(trigger) => (
        <Link
          {...trigger}
          {...{ [CONTROL]: '' }}
          label={`${word.name}: ${word.label}`}
          type="inherit"
          hasUnderline
          style={controlStyle}
        >
          {word.label}
        </Link>
      )}
    >
      {(value, _commit, close) => (
        <Options
          word={word}
          value={value}
          formatCount={formatCount}
          choose={(next) => {
            onChange(word.id, next);
            close();
          }}
        />
      )}
    </ComplexSelector>
  );
}

/** What to focus when a token goes away: the control before it, else the one after it. */
type Pending = { removed: HTMLElement; before: HTMLElement | null; after: HTMLElement | null };

const defaultFormatCount = (n: number) => n.toLocaleString();

/**
 * A filter that reads as a sentence. Each changeable word is a button that opens a list of options; everything else
 * is plain text. It fetches nothing and keeps no filter state: pass the sentence in `parts` and update it in
 * `onChange`.
 */
export function SentenceFilter({ parts, onChange, onRemove, as = 'p', formatCount = defaultFormatCount }: SentenceFilterProps) {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<Pending | null>(null);

  // After a token is removed its button is gone, and focus would fall to the page. Move it to a neighbour.
  useLayoutEffect(() => {
    const p = pending.current;
    if (p == null || p.removed.isConnected) return;
    pending.current = null;
    const target = [p.before, p.after].find((el) => el?.isConnected) ?? root.current?.querySelector<HTMLElement>(`[${CONTROL}]`);
    target?.focus();
  });

  const remove = (id: string, button: HTMLElement) => {
    const controls = [...(root.current?.querySelectorAll<HTMLElement>(`[${CONTROL}]`) ?? [])];
    const at = controls.indexOf(button);
    pending.current = { removed: button, before: controls[at - 1] ?? null, after: controls[at + 1] ?? null };
    onRemove?.(id);
  };

  const content = parts.map((part, index) => {
    if (typeof part === 'string') return part;
    if (part.type === 'word') return <Word key={part.id} word={part} onChange={onChange} formatCount={formatCount} />;
    return (
      <Text key={part.id} type="inherit">
        {part.label}
        {onRemove && (
          <Link
            {...{ [CONTROL]: '' }}
            label={part.removeLabel}
            type="inherit"
            onClick={(event) => remove(part.id, event.currentTarget)}
            style={removeStyle}
          >
            <Icon icon="close" size="xsm" color="inherit" />
          </Link>
        )}
      </Text>
    );
  });

  return as === 'p' ? (
    <Text as="p" type="inherit" ref={root}>
      {content}
    </Text>
  ) : (
    <Heading level={Number(as[1]) as 1 | 2 | 3} ref={root}>
      {content}
    </Heading>
  );
}

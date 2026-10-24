import { Collapsible } from '@astryxdesign/core/Collapsible';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useLocale } from '@astryxdesign/core/i18n';
import { StackItem } from '@astryxdesign/core/Stack';
import { StatusDot, type StatusDotVariant } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { VStack } from '@astryxdesign/core/VStack';
import { useId, useMemo, type ReactNode } from 'react';
import { groupByLocalDay } from './groupItems.js';
import { textOf } from './textOf.js';

export type { StatusDotVariant };

export type TimelineItem = {
  /** Stable key for the item. */
  id: string;
  /** When it happened, ISO 8601. */
  time: string;
  /** Who or what did it. */
  actor?: ReactNode;
  /** Outcome of the event. It is always shown with a visible label, never as colour alone. */
  status?: StatusDotVariant;
  /** One line saying what happened. */
  title: ReactNode;
  /** Detail shown behind a disclosure button, collapsed by default. */
  body?: ReactNode;
};

/** The words Timeline writes itself. Pass `labels` to translate or reword them. */
export type TimelineLabels = {
  /** Shown instead of the list when there are no items. */
  empty: string;
  /** Visible text of the button that discloses an item's body. */
  details: string;
  /** What a screen reader hears for that button, given the item's title as plain text. */
  detailsFor: (title: string) => string;
  /** Heading of the group for items whose time does not parse, when grouped by day. */
  unknownDay: string;
  /** The visible label next to each status. A status left out keeps its English default. */
  status: Partial<Record<StatusDotVariant, string>>;
};

export type TimelineProps = {
  /** Events in display order. Timeline renders them as given and never sorts. */
  items: readonly TimelineItem[];
  /** `day` adds a heading per run of items that share a local calendar day. */
  groupBy?: 'day';
  /** Level of the day headings and of the empty-state title, so they fit the page outline. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Overrides for the built-in English text. */
  labels?: Partial<TimelineLabels>;
};

const DEFAULT_STATUS_LABELS: Record<string, string> = {
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  accent: 'Info',
  neutral: 'Neutral',
};

/** What the caller's partial labels leave out falls back to English. A reworded `details` also rewords `detailsFor`. */
function resolveLabels(labels: Partial<TimelineLabels> | undefined): TimelineLabels {
  const details = labels?.details ?? 'Details';
  return {
    empty: labels?.empty ?? 'No activity yet',
    details,
    detailsFor: labels?.detailsFor ?? ((title) => (labels?.details ? `${details}: ${title}` : `Details for ${title}`)),
    unknownDay: labels?.unknownDay ?? 'Unknown date',
    status: { ...DEFAULT_STATUS_LABELS, ...labels?.status },
  };
}

/**
 * A vertical event feed: an ordered list of events, each with a status marker, a title, who and when,
 * and an optional body behind a disclosure button. It fetches nothing; the caller passes the items.
 */
export function Timeline({ items, groupBy, headingLevel = 3, labels }: TimelineProps) {
  const locale = useLocale();
  const idPrefix = useId();
  const text = useMemo(() => resolveLabels(labels), [labels]);
  const groups = useMemo(() => (groupBy === 'day' ? groupByLocalDay(items) : []), [items, groupBy]);
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }), [locale]);

  if (items.length === 0) {
    return <EmptyState title={text.empty} headingLevel={headingLevel} isCompact />;
  }

  const timeFormat = groupBy === 'day' ? 'time' : 'date_time';

  if (groupBy !== 'day') {
    return <TimelineList items={items} timeFormat={timeFormat} labels={text} />;
  }

  return (
    <VStack as="ol" gap={6}>
      {groups.map((group, index) => {
        const headingId = `${idPrefix}-day-${index}`;
        return (
          <VStack as="li" key={`${group.key}:${group.items[0]?.id}`} gap={2}>
            <Heading level={headingLevel} id={headingId}>
              {group.date ? dayFormat.format(group.date) : text.unknownDay}
            </Heading>
            <TimelineList items={group.items} timeFormat={timeFormat} labels={text} labelledBy={headingId} />
          </VStack>
        );
      })}
    </VStack>
  );
}

function TimelineList({
  items,
  timeFormat,
  labels,
  labelledBy,
}: {
  items: readonly TimelineItem[];
  timeFormat: 'time' | 'date_time';
  labels: TimelineLabels;
  labelledBy?: string;
}) {
  return (
    <VStack as="ol" aria-labelledby={labelledBy}>
      {items.map((item, index) => (
        <TimelineEntry
          key={item.id}
          item={item}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          timeFormat={timeFormat}
          labels={labels}
        />
      ))}
    </VStack>
  );
}

function TimelineEntry({
  item,
  isFirst,
  isLast,
  timeFormat,
  labels,
}: {
  item: TimelineItem;
  isFirst: boolean;
  isLast: boolean;
  timeFormat: 'time' | 'date_time';
  labels: TimelineLabels;
}) {
  const label = item.status ? (labels.status[item.status] ?? item.status) : undefined;
  const titleText = textOf(item.title);
  return (
    <HStack as="li" gap={3}>
      {/* Decorative rail: the visible status label below carries the meaning. */}
      <VStack hAlign="center" aria-hidden="true">
        {/* The rule runs into the dot from above, level with the title's first line, so the rail is unbroken. */}
        <VStack height="var(--spacing-1-5)">{isFirst ? null : <Divider orientation="vertical" variant="strong" />}</VStack>
        <StatusDot variant={item.status ?? 'neutral'} label={label ?? ''} />
        {isLast ? null : (
          <StackItem size="fill">
            <Divider orientation="vertical" variant="strong" />
          </StackItem>
        )}
      </VStack>
      <StackItem size="fill">
        {/* overflow-wrap is inherited: a long title, name or unbroken URL wraps instead of widening the page. */}
        <VStack gap={1} paddingBlockEnd={isLast ? 0 : 4} style={{ overflowWrap: 'anywhere' }}>
          <Text as="div" type="label">
            {item.title}
          </Text>
          <HStack gap={2} align="center" wrap="wrap">
            {item.actor ? <Text type="supporting">{item.actor}</Text> : null}
            <Timestamp value={item.time} format={timeFormat} hasTooltip={false} />
            {label ? <Text type="supporting">{label}</Text> : null}
          </HStack>
          {item.body ? (
            <Collapsible
              defaultIsOpen={false}
              chevronPosition="start"
              trigger={
                <>
                  {/* The button's name is the longer phrase, which contains the visible word (WCAG 2.5.3). */}
                  <Text type="supporting" aria-hidden="true">
                    {labels.details}
                  </Text>
                  <VisuallyHidden>{titleText ? labels.detailsFor(titleText) : labels.details}</VisuallyHidden>
                </>
              }
            >
              <VStack paddingBlockStart={1}>
                <Text as="div" type="body">
                  {item.body}
                </Text>
              </VStack>
            </Collapsible>
          ) : null}
        </VStack>
      </StackItem>
    </HStack>
  );
}

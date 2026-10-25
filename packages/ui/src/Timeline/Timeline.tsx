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
import { groupByDay, knownTimeZone, noonUtc, parseTime, type ParsedTime } from './groupItems.js';
import { textOf } from './textOf.js';

export type { StatusDotVariant };

export type TimelineItem = {
  /** Stable key for the item. */
  id: string;
  /**
   * When it happened, ISO 8601. A bare date (`2026-03-02`) is a calendar day with no time of day and no zone, so it
   * stays on that day wherever it is viewed. Anything else is a moment and needs an offset or `Z`
   * (`2026-03-02T09:30:00Z`); it falls on the day it has in the feed's time zone. A moment written with neither is
   * read in the viewer's own zone, as JavaScript does.
   */
  time: string;
  /** Who or what did it. */
  actor?: ReactNode;
  /** Outcome of the event. It is always shown with a visible label, never as colour alone. */
  status?: StatusDotVariant;
  /** One line saying what happened. The disclosure button is named from its text; with none, from the time. */
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
  /** What a screen reader hears for that button, given the item's title as plain text. Keep the visible `details` text in it. */
  detailsFor: (title: string) => string;
  /** Heading of the group for items whose time does not parse, when grouped by day. */
  unknownDay: string;
  /** The visible label next to each status. A status left out keeps its English default. */
  status: Partial<Record<StatusDotVariant, string>>;
};

export type TimelineProps = {
  /** Events in display order. Timeline renders them as given and never sorts. */
  items: readonly TimelineItem[];
  /** `day` adds a heading per run of items that share a calendar day in `timeZone`. */
  groupBy?: 'day';
  /**
   * IANA zone (`Europe/Berlin`) in which moments are grouped and shown. Defaults to the viewer's zone. A zone the
   * platform does not know falls back to the default. Date-only times ignore it.
   */
  timeZone?: string;
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
export function Timeline({ items, groupBy, timeZone, headingLevel = 3, labels }: TimelineProps) {
  const locale = useLocale();
  const idPrefix = useId();
  const text = useMemo(() => resolveLabels(labels), [labels]);
  const zone = useMemo(() => knownTimeZone(timeZone), [timeZone]);
  const formats = useMemo(() => timeFormats(locale, zone), [locale, zone]);
  const groups = useMemo(() => (groupBy === 'day' ? groupByDay(items, zone) : []), [items, groupBy, zone]);

  if (items.length === 0) {
    return <EmptyState title={text.empty} headingLevel={headingLevel} isCompact />;
  }

  if (groupBy !== 'day') {
    return <TimelineList items={items} isGrouped={false} formats={formats} labels={text} />;
  }

  return (
    <VStack as="ol" gap={6}>
      {groups.map((group, index) => {
        const headingId = `${idPrefix}-day-${index}`;
        return (
          <VStack as="li" key={`${group.key}:${group.items[0]?.id}`} gap={2}>
            <Heading level={headingLevel} id={headingId}>
              {group.date ? formats.day.format(group.date) : text.unknownDay}
            </Heading>
            <TimelineList items={group.items} isGrouped formats={formats} labels={text} labelledBy={headingId} />
          </VStack>
        );
      })}
    </VStack>
  );
}

type TimeFormats = {
  /** The zone moments are shown in; undefined is the viewer's own, which Astryx's Timestamp renders. */
  zone: string | undefined;
  /** A calendar day in full, of a noon-UTC date (the day heading). */
  day: Intl.DateTimeFormat;
  /** A calendar day, of a noon-UTC date (a date-only time). */
  date: Intl.DateTimeFormat;
  /** Time of day of a moment, in `zone`. */
  clock: Intl.DateTimeFormat;
  /** Date and time of a moment, in `zone`. */
  dateTime: Intl.DateTimeFormat;
};

function timeFormats(locale: string, zone: string | undefined): TimeFormats {
  // A chosen zone is named in the text, since it may not be the one the reader is in.
  const timeZoneName = zone ? ('short' as const) : undefined;
  const dayFields = { year: 'numeric', month: 'short', day: 'numeric' } as const;
  const clockFields = { hour: 'numeric', minute: '2-digit', timeZone: zone, timeZoneName } as const;
  return {
    zone,
    day: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }),
    date: new Intl.DateTimeFormat(locale, { ...dayFields, timeZone: 'UTC' }),
    clock: new Intl.DateTimeFormat(locale, clockFields),
    dateTime: new Intl.DateTimeFormat(locale, { ...dayFields, ...clockFields }),
  };
}

/** The time as one phrase, for a screen-reader name: a date, a date and time, or the text as given when it does not parse. */
function timePhrase(parsed: ParsedTime | undefined, raw: string, formats: TimeFormats): string {
  if (!parsed) return raw;
  return parsed.kind === 'date' ? formats.date.format(noonUtc(parsed)) : formats.dateTime.format(parsed.date);
}

function TimelineList({
  items,
  isGrouped,
  formats,
  labels,
  labelledBy,
}: {
  items: readonly TimelineItem[];
  /** Under a day heading, which already says the date. */
  isGrouped: boolean;
  formats: TimeFormats;
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
          isGrouped={isGrouped}
          formats={formats}
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
  isGrouped,
  formats,
  labels,
}: {
  item: TimelineItem;
  isFirst: boolean;
  isLast: boolean;
  isGrouped: boolean;
  formats: TimeFormats;
  labels: TimelineLabels;
}) {
  const label = item.status ? (labels.status[item.status] ?? item.status) : undefined;
  const parsed = parseTime(item.time);
  // A title with no text (an icon) cannot name its button, so the time does: one item's time rarely repeats.
  const subject = textOf(item.title) || timePhrase(parsed, item.time, formats);
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
            <TimeText time={item.time} parsed={parsed} isGrouped={isGrouped} formats={formats} />
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
                  <VisuallyHidden>{labels.detailsFor(subject)}</VisuallyHidden>
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

/**
 * One item's time. Astryx's Timestamp renders a moment in the viewer's zone; for a chosen zone, or a calendar day
 * (which has no zone to render in), the time is written here, in a <time> with the same machine-readable value.
 */
function TimeText({
  time,
  parsed,
  isGrouped,
  formats,
}: {
  time: string;
  parsed: ParsedTime | undefined;
  isGrouped: boolean;
  formats: TimeFormats;
}) {
  // Timestamp renders nothing for a time it cannot parse; show the text as given rather than lose it.
  if (!parsed) return <Text type="supporting">{time}</Text>;
  if (parsed.kind === 'date') {
    // A day has no time of day to add under a heading that already names the day.
    if (isGrouped) return null;
    return (
      <Text type="supporting">
        <time dateTime={parsed.iso}>{formats.date.format(noonUtc(parsed))}</time>
      </Text>
    );
  }
  if (formats.zone === undefined) {
    return <Timestamp value={time} format={isGrouped ? 'time' : 'date_time'} hasTooltip={false} />;
  }
  return (
    <Text type="supporting">
      <time dateTime={parsed.iso}>{(isGrouped ? formats.clock : formats.dateTime).format(parsed.date)}</time>
    </Text>
  );
}

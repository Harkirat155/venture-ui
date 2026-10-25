/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'Timeline',
  displayName: 'Timeline',
  category: 'Table & List',
  keywords: ['activity feed', 'audit log', 'history', 'event log', 'changelog', 'vertical stepper', 'feed'],
  import: '@venture-ui/ui/Timeline',
  usage: {
    description:
      'A vertical event feed for activity logs, audit trails and histories. Each event has a status marker, a title, who did it and when, and an optional body behind a disclosure button. It fetches nothing: pass the events in the order to show them. For progress through known steps use Stepper; for tabular records use Table.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass items already sorted (newest first or oldest first). Timeline never reorders, so a list that is out of order repeats a day heading instead of hiding the problem.',
      },
      {
        guidance: true,
        description:
          'Use groupBy="day" once a feed spans days. Each item then shows only its time, and the day heading carries the date.',
      },
      {
        guidance: true,
        description:
          'Give a string or plain-text title when the item has a body: the disclosure button is named "Details for <title>" for screen readers, so the title is what tells many identical buttons apart. A title with no text (an icon) falls back to the item\'s time, "Details for Mar 2, 2026, 9:30 AM"; two such items with the same time would share a name.',
      },
      {
        guidance: true,
        description:
          'Send a moment as ISO 8601 with an offset or Z, and a day with no time of day as a bare YYYY-MM-DD. A bare date stays on its day in every zone; a moment is placed by timeZone (the viewer\'s zone when you set none), so a record made at 23:30 UTC lands on the next day for a viewer east of Greenwich.',
      },
      {
        guidance: true,
        description:
          'Set status only when the event has an outcome. An item without one gets a plain marker and no label.',
      },
      {
        guidance: false,
        description:
          'Pass thousands of items at once. Timeline renders every item it is given, so page or window the data first.',
      },
    ],
    accessibility: [
      {
        name: 'Ordered list',
        category: 'Semantics',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'ol of li',
        description:
          'The feed is an ol with one li per event, so screen readers announce the count and position. With groupBy="day" each day is an li holding a heading and its own ol, which the heading labels.',
      },
      {
        name: 'Time',
        category: 'Semantics',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'time with datetime',
        description:
          'Every time is a time element with an ISO 8601 datetime attribute (YYYY-MM-DD for a bare date). Two exceptions: under a day heading a bare date adds no time element of its own, since the heading says the day; and a time that does not parse is shown as the text given, with no time element.',
      },
      {
        name: 'Status label',
        category: 'Content',
        criterion: '1.4.1 Use of Color',
        requirement: 'Text beside the dot',
        description:
          'A status is never shown as colour alone. Its dot is always paired with a visible text label such as "Success" or "Error". The coloured rail is hidden from assistive technology.',
      },
      {
        name: 'Details button',
        category: 'Keyboard',
        criterion: '2.1.1 Keyboard',
        requirement: 'Tab, Enter, Space',
        states: ['Collapsed', 'Expanded'],
        description:
          'A body sits behind a button with aria-expanded and aria-controls. Tab reaches it, and Enter or Space toggles it. Bodies start collapsed.',
      },
    ],
    anatomy: [
      { name: 'Day heading', required: false, description: 'One heading per run of items on the same calendar day, shown with groupBy="day".' },
      { name: 'Marker rail', required: true, description: 'A status dot per item joined by a thin line to the next item.' },
      { name: 'Title', required: true, description: 'One line saying what happened.' },
      { name: 'Meta row', required: true, description: 'Actor, time, and the status label.' },
      { name: 'Details disclosure', required: false, description: 'A button that reveals the item\'s body.' },
      { name: 'Empty state', required: false, description: 'Shown instead of the list when there are no items.' },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'readonly TimelineItem[]',
      description:
        'The events, in display order. A TimelineItem is { id: string; time: string; actor?: ReactNode; status?: StatusDotVariant; title: ReactNode; body?: ReactNode }. time is ISO 8601: a bare date (2026-03-02) is a calendar day with no time of day and no zone, shown as that date wherever it is viewed; anything else is a moment and needs an offset or Z (one without either is read in the viewer\'s own zone). A date that does not exist (2026-02-30) does not parse. status is one of success, warning, error, accent, neutral. An empty array shows the empty state.',
      required: true,
    },
    {
      name: 'groupBy',
      type: "'day'",
      description:
        'Adds a heading per run of consecutive items that share a calendar day in timeZone, formatted with Intl in the Astryx locale. Items whose time does not parse go under an "Unknown date" heading. Omit it for a flat list, which shows the date with each time.',
    },
    {
      name: 'timeZone',
      type: 'string',
      description:
        'IANA zone name (Europe/Berlin) in which moments are grouped by day and shown; the times then carry the zone\'s short name ("10:30 PM EST"). Defaults to the viewer\'s zone, where the times are Astryx Timestamps. A name the platform does not know falls back to the default instead of throwing. Bare dates ignore it.',
    },
    {
      name: 'headingLevel',
      type: '2 | 3 | 4 | 5 | 6',
      description: 'Level of the day headings and of the empty-state title, so they fit the heading outline of the page.',
      default: '3',
    },
    {
      name: 'labels',
      type: 'Partial<TimelineLabels>',
      description:
        'Overrides for the built-in English text, to translate or reword it. Anything you leave out keeps its default; a reworded details also rewords detailsFor. A detailsFor you write must keep the visible details text in it, so voice-control users can say what they see. TimelineLabels is { empty: string; details: string; detailsFor: (title: string) => string; unknownDay: string; status: Partial<Record<StatusDotVariant, string>> }. The defaults are "No activity yet", "Details", "Details for <title>", "Unknown date", and Success, Warning, Error, Info, Neutral for the five statuses.',
    },
  ],
  examples: [
    {
      label: 'Audit trail grouped by day',
      code: `import {Timeline} from '@venture-ui/ui/Timeline';

<Timeline
  groupBy="day"
  items={[
    {id: 'e3', time: '2026-03-02T09:30:00Z', actor: 'Priya', status: 'success', title: 'Deploy finished', body: 'Build 4821 on main'},
    {id: 'e2', time: '2026-03-02T08:00:00Z', actor: 'Priya', title: 'Deploy started'},
    {id: 'e1', time: '2026-03-01T17:10:00Z', actor: 'CI', status: 'error', title: 'Rollback failed', body: 'Timed out after 300 s'},
  ]}
/>`,
    },
    {
      label: 'Audit log in the team\'s zone, with a bare date',
      code: `import {Timeline} from '@venture-ui/ui/Timeline';

<Timeline
  groupBy="day"
  timeZone="Europe/Berlin"
  items={[
    {id: 'e2', time: '2026-03-02T23:30:00Z', actor: 'CI', status: 'success', title: 'Nightly build', body: 'Build 4822'},
    {id: 'e1', time: '2026-03-02', title: 'Release freeze starts'},
  ]}
/>`,
    },
    {
      label: 'Flat list with translated text',
      code: `import {Timeline} from '@venture-ui/ui/Timeline';

<Timeline
  items={[{id: 'e1', time: '2026-03-02T09:30:00Z', status: 'success', title: 'Bereitstellung abgeschlossen', body: 'Build 4821'}]}
  labels={{
    empty: 'Noch keine Aktivität',
    details: 'Details',
    detailsFor: (title) => 'Details zu ' + title,
    status: {success: 'Erfolgreich', error: 'Fehler'},
  }}
/>`,
    },
  ],
};

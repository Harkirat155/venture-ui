'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/VStack';
import { Timeline, type TimelineItem } from '@venture-ui/ui/Timeline';

// Times are ISO 8601 with a Z. A bare date such as '2026-03-01' would be a day with no time of day.
const items: TimelineItem[] = [
  { id: 'e4', time: '2026-03-02T09:30:00Z', actor: 'Priya', status: 'success', title: 'Deploy finished', body: 'Build 4821 on main, 3 of 3 checks green.' },
  { id: 'e3', time: '2026-03-02T08:00:00Z', actor: 'Priya', title: 'Deploy started' },
  { id: 'e2', time: '2026-03-01T17:10:00Z', actor: 'CI', status: 'error', title: 'Rollback failed', body: 'Timed out after 300 s waiting for the old pods to drain.' },
  { id: 'e1', time: '2026-03-01T16:40:00Z', actor: 'CI', status: 'warning', title: 'Canary slower than baseline' },
];

export default function TimelineShowcase() {
  return (
    <VStack gap={3}>
      <Heading level={2}>Activity</Heading>
      <Timeline items={items} groupBy="day" timeZone="UTC" />
    </VStack>
  );
}

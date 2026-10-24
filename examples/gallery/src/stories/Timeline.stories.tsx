import { Link } from '@astryxdesign/core/Link';
import { Timeline, type TimelineItem } from '@venture-ui/ui/Timeline';
import { defineStories } from '../defineStories';

// Fixed times, read in UTC: the Playwright projects pin the timezone and locale.
const deploys: TimelineItem[] = [
  {
    id: 'd4',
    time: '2026-03-02T09:42:00Z',
    actor: 'Priya Nair',
    status: 'success',
    title: 'Deploy finished',
    body: 'Build 4821 reached production in 3 min 12 s. 2 migrations ran, 0 rolled back.',
  },
  { id: 'd3', time: '2026-03-02T09:38:00Z', actor: 'Priya Nair', title: 'Deploy started' },
  {
    id: 'd2',
    time: '2026-03-02T08:05:00Z',
    actor: 'CI',
    status: 'warning',
    title: 'Build 4820 passed with 3 flaky tests',
    body: 'checkout/retry, search/debounce and upload/resume failed once and passed on retry.',
  },
  {
    id: 'd1',
    time: '2026-03-01T17:10:00Z',
    actor: 'CI',
    status: 'error',
    title: 'Rollback failed',
    body: 'The previous release did not become healthy within 300 s, so the rollback was abandoned.',
  },
  { id: 'd0', time: '2026-03-01T16:55:00Z', actor: 'Marcus Webb', status: 'accent', title: 'Release 2026.03 scheduled' },
];

const long: TimelineItem[] = [
  {
    id: 'l2',
    time: '2026-03-02T11:00:00Z',
    actor: 'integration-service-account-with-a-very-long-name@example.org',
    status: 'warning',
    title: (
      <>
        Permission change requested on <Link href="#/Timeline/LongContent">workspace/finance/quarterly-reports/2026-q1</Link>{' '}
        awaiting approval from two reviewers in different regions
      </>
    ),
    body: (
      <>
        Requested role: editor with export rights. The request replaces the viewer role granted on 2025-11-14 and
        expires after 30 days unless renewed. https://example.org/a/very/long/unbroken/url/that/should/wrap/instead/of/overflowing
      </>
    ),
  },
  {
    id: 'l1',
    time: '2026-03-02T10:00:00Z',
    title: 'Configuration exported',
    body: 'config.yaml, 14 keys.',
  },
];

export default defineStories({
  component: 'Timeline',
  stories: {
    // The gallery page has an h1 and no h2 above the story, so the headings sit one level down.
    Default: () => <Timeline items={deploys} headingLevel={2} />,
    GroupedByDay: () => <Timeline items={deploys} groupBy="day" headingLevel={2} />,
    Empty: () => <Timeline items={[]} headingLevel={2} />,
    LongContent: () => <Timeline items={long} groupBy="day" headingLevel={2} />,
  },
});

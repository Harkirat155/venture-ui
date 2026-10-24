import { DiffView } from '@venture-ui/ui/DiffView';
import { defineStories } from '../defineStories';

// A deployment config before and after review. Fixed text, so the baselines are stable.
const config = (v: 'before' | 'after') =>
  [
    'name: web',
    v === 'before' ? 'replicas: 2' : 'replicas: 3',
    v === 'before' ? 'image: registry.example.org/web:1.4.2' : 'image: registry.example.org/web:1.5.0',
    'env:',
    v === 'before' ? '  LOG_LEVEL: info' : '  LOG_LEVEL: debug',
    '  REGION: eu-west',
    '  TIMEOUT: 30s',
    '  RETRIES: 3',
    '  CACHE_TTL: 5m',
    ...(v === 'after' ? ['  TRACING: "on"'] : []),
    'resources:',
    '  cpu: 250m',
    v === 'before' ? '  memory: 256Mi' : '  memory: 512Mi',
    'ports:',
    '  - 8080',
    '  - 9090',
    'labels:',
    '  team: platform',
    '  tier: backend',
    ...(v === 'before' ? ['  legacy: "true"'] : []),
    'healthcheck:',
    '  path: /healthz',
    '  interval: 10s',
  ].join('\n') + '\n';

const handbook = (v: 'before' | 'after') =>
  [
    v === 'before' ? '# On-call handbook' : '# On-call handbook (2026)',
    '',
    'Read this before your first shift.',
    '',
    '## Escalation',
    '',
    v === 'before' ? '1. Page the primary on-call.' : '1. Page the primary on-call, then post in the incident channel.',
    '2. If nobody answers in 10 minutes, page the secondary.',
    '3. Call the duty manager for anything customer-facing.',
    '',
    '```sh',
    'oncall page --team platform',
    '```',
    '',
    '## Handover',
    '',
    'Write the handover note before the shift ends.',
    ...(v === 'after' ? ['', 'Include open incidents and anything you are watching.'] : []),
  ].join('\n') + '\n';

// 2,000 lines with three edits far apart: almost everything collapses, as it would in a real review.
const large = (v: 'before' | 'after') =>
  Array.from({ length: 2000 }, (_, i) => {
    const n = i + 1;
    if (v === 'after' && (n === 300 || n === 1000 || n === 1700)) return `line ${n} (edited)`;
    return `line ${n}`;
  }).join('\n');

export default defineStories({
  component: 'DiffView',
  maxWidth: '72rem',
  stories: {
    // Explicit modes for the screenshots; Auto follows the viewport (unified at 390 px, split at 1280 px).
    Unified: () => <DiffView before={config('before')} after={config('after')} mode="unified" context={1} />,
    Split: () => <DiffView before={config('before')} after={config('after')} mode="split" context={1} />,
    Auto: () => <DiffView before={config('before')} after={config('after')} context={1} />,
    Markdown: () => <DiffView before={handbook('before')} after={handbook('after')} mode="unified" language="markdown" />,
    Identical: () => <DiffView before={config('before')} after={config('before')} />,
    LineEndings: () => (
      <DiffView before={'a\r\nb\r\nc\r\n'} after={'a\nb changed\nc\n'} mode="unified" normalizeLineEndings={false} />
    ),
    LongLines: () => (
      <DiffView
        before={'https://example.org/' + 'a-very-long-path-segment/'.repeat(12) + 'old\nshort\n'}
        after={'https://example.org/' + 'a-very-long-path-segment/'.repeat(12) + 'new\nshort\n'}
        mode="unified"
      />
    ),
    Large: () => <DiffView before={large('before')} after={large('after')} mode="unified" />,
  },
});

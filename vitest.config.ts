import { defineConfig } from 'vitest/config';

// Vitest reads its config from a default export. TZ is pinned so that "local day" is the same everywhere, and every
// test has an explicit timeout so a hang fails fast instead of stalling CI.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'node', include: ['packages/*/src/**/*.test.ts'], environment: 'node', testTimeout: 10_000 } },
      {
        test: {
          name: 'dom',
          include: ['packages/*/src/**/*.test.tsx'],
          environment: 'jsdom',
          env: { TZ: 'UTC' },
          testTimeout: 10_000,
        },
      },
    ],
  },
});

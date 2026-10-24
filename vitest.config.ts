import { defineConfig } from 'vitest/config';

// Vitest reads its config from a default export. TZ is pinned so that "local day" is the same everywhere.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'node', include: ['packages/*/src/**/*.test.ts'], environment: 'node' } },
      {
        test: {
          name: 'dom',
          include: ['packages/*/src/**/*.test.tsx'],
          environment: 'jsdom',
          env: { TZ: 'UTC' },
        },
      },
    ],
  },
});
